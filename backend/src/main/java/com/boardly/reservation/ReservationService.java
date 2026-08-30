package com.boardly.reservation;

import com.boardly.auth.AuthUser;
import com.boardly.branch.*;
import com.boardly.common.exception.BoardlyException;
import com.boardly.user.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {
    private static final List<Reservation.ReservationStatus> BOOKED_STATUSES = List.of(
            Reservation.ReservationStatus.pending, Reservation.ReservationStatus.confirmed);

    private final BranchRepository branches;
    private final StoreTableRepository tables;
    private final BranchOperatingHourRepository hours;
    private final BookingBlackoutRepository blackouts;
    private final BranchPricingRuleRepository pricing;
    private final ReservationRepository reservations;
    private final PlaySessionRepository sessions;
    private final UserRepository users;
    private final StaffBranchAssignmentRepository assignments;

    public ReservationService(BranchRepository branches, StoreTableRepository tables,
            BranchOperatingHourRepository hours, BookingBlackoutRepository blackouts,
            BranchPricingRuleRepository pricing, ReservationRepository reservations,
            PlaySessionRepository sessions, UserRepository users,
            StaffBranchAssignmentRepository assignments) {
        this.branches = branches;
        this.tables = tables;
        this.hours = hours;
        this.blackouts = blackouts;
        this.pricing = pricing;
        this.reservations = reservations;
        this.sessions = sessions;
        this.users = users;
        this.assignments = assignments;
    }

    @Transactional(readOnly = true)
    public ReservationDtos.AvailabilityResponse available(UUID branchId, OffsetDateTime start,
            OffsetDateTime end, short players) {
        validateWindow(branchId, start, end, players);
        List<ReservationDtos.AvailableTableResponse> result = tables
                .findByBranchIdAndIsActiveTrueOrderBySortOrderAsc(branchId).stream()
                .filter(table -> eligibility(table, start, end, players, null).assignable())
                .map(table -> new ReservationDtos.AvailableTableResponse(table.getId(), table.getCode(),
                        table.getZone().getName(), table.getMinPlayers(), table.getMaxPlayers()))
                .toList();
        BranchPricingRule rule = activeRule(branchId, start);
        return new ReservationDtos.AvailabilityResponse(start, end, players,
                feeForBlocks(rule, players, billableBlocks(Duration.between(start, end).getSeconds())),
                rule.getCurrency(), result);
    }

    @Transactional
    public ReservationDtos.ReservationResponse create(AuthUser auth,
            ReservationDtos.CreateReservationRequest request) {
        validateWindow(request.branchId(), request.startsAt(), request.endsAt(), request.playerCount());
        StoreTable table = tables.findForUpdate(request.tableId(), request.branchId())
                .orElseThrow(() -> bad("Table not found", "TABLE_NOT_FOUND"));
        AssignmentEligibility assignment = eligibility(table, request.startsAt(), request.endsAt(),
                request.playerCount(), null);
        if (!assignment.assignable()) throw conflict(assignment);

        BranchPricingRule rule = activeRule(request.branchId(), request.startsAt());
        OffsetDateTime now = OffsetDateTime.now();
        Reservation reservation = new Reservation();
        reservation.setReservationNumber("RSV-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 10).toUpperCase(Locale.ROOT));
        reservation.setUser(users.findById(auth.id())
                .orElseThrow(() -> unauthorized("Your account is unavailable.")));
        reservation.setBranch(table.getBranch());
        reservation.setTable(table);
        reservation.setPricingRule(rule);
        reservation.setContactName(request.contactName().trim());
        reservation.setContactPhone(request.contactPhone());
        reservation.setContactEmail(request.contactEmail());
        reservation.setStartsAt(request.startsAt());
        reservation.setEndsAt(request.endsAt());
        reservation.setPlayerCount(request.playerCount());
        reservation.setStatus(Reservation.ReservationStatus.confirmed);
        reservation.setEstimatedFee(feeForBlocks(rule, request.playerCount(),
                billableBlocks(Duration.between(request.startsAt(), request.endsAt()).getSeconds())));
        reservation.setCreatedBy(auth.id());
        reservation.setCreatedAt(now);
        reservation.setUpdatedAt(now);
        return reservationResponse(reservations.save(reservation));
    }

    @Transactional(readOnly = true)
    public List<ReservationDtos.ReservationResponse> mine(AuthUser auth) {
        return reservations.findByUserIdOrderByStartsAtDesc(auth.id()).stream()
                .map(this::reservationResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReservationDtos.ReservationResponse reservation(AuthUser auth, String number) {
        return reservationResponse(reservations.findByReservationNumberAndUserId(number, auth.id())
                .orElseThrow(() -> notFound("Reservation not found")));
    }

    @Transactional
    public ReservationDtos.ReservationResponse cancel(AuthUser auth, String number,
            ReservationDtos.CancelReservationRequest request) {
        Reservation reservation = reservations.findByReservationNumberAndUserId(number, auth.id())
                .orElseThrow(() -> notFound("Reservation not found"));
        if (reservation.getStatus() != Reservation.ReservationStatus.pending
                && reservation.getStatus() != Reservation.ReservationStatus.confirmed) {
            throw bad("This reservation cannot be cancelled.", "RESERVATION_NOT_CANCELLABLE");
        }
        reservation.setStatus(Reservation.ReservationStatus.cancelled);
        reservation.setCancelledAt(OffsetDateTime.now());
        reservation.setCancellationReason(request == null ? null : request.reason());
        return reservationResponse(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationDtos.StaffReservationResponse> staffReservations(AuthUser auth, UUID branchId,
            LocalDate date, String search) {
        requireStaffOperator(auth);
        authorizeBranch(auth, branchId);
        OffsetDateTime now = OffsetDateTime.now();
        LocalDate selectedDate = date == null ? now.toLocalDate() : date;
        OffsetDateTime dayStart = selectedDate.atStartOfDay().atOffset(now.getOffset());
        OffsetDateTime dayEnd = dayStart.plusDays(1);
        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return reservations.findByBranchIdAndStartsAtBetweenAndStatusInOrderByStartsAtAsc(
                        branchId, dayStart, dayEnd, BOOKED_STATUSES).stream()
                .filter(reservation -> matches(reservation, query))
                .map(reservation -> staffReservationResponse(reservation, now)).toList();
    }

    @Transactional
    public ReservationDtos.LiveTableResponse checkIn(AuthUser auth, UUID id) {
        requireStaffOperator(auth);
        Reservation reservation = reservations.findById(id)
                .orElseThrow(() -> notFound("Reservation not found"));
        authorizeBranch(auth, reservation.getBranch().getId());
        OffsetDateTime now = OffsetDateTime.now();
        CheckInEligibility checkIn = checkInEligibility(reservation, now);
        if (!checkIn.eligible()) throw bad(checkIn.reason(), "RESERVATION_NOT_CHECKIN_READY");

        StoreTable table = tables.findForUpdate(reservation.getTable().getId(), reservation.getBranch().getId())
                .orElseThrow(() -> notFound("Table not found"));
        if (!table.isActive() || table.getOperationalStatus() != StoreTable.OperationalStatus.available) {
            throw conflict(blocked("OPERATIONALLY_UNAVAILABLE", "Table is inactive or unavailable."));
        }
        if (sessions.existsByTableIdAndStatus(table.getId(), PlaySession.PlaySessionStatus.active)) {
            throw conflict(blocked("ACTIVE_SESSION", "An active play session is using this table."));
        }

        PlaySession session = new PlaySession();
        session.setReservation(reservation);
        session.setBranch(reservation.getBranch());
        session.setTable(table);
        session.setUser(reservation.getUser());
        session.setPlayerCount(reservation.getPlayerCount());
        session.setPricingRule(reservation.getPricingRule());
        session.setCheckInAt(now);
        session.setStatus(PlaySession.PlaySessionStatus.active);
        session.setCreatedBy(auth.id());
        session.setCreatedAt(now);
        sessions.save(session);
        reservation.setStatus(Reservation.ReservationStatus.checked_in);
        return live(table, session, reservation, "occupied",
                blocked("ACTIVE_SESSION", "An active play session is using this table."), now);
    }

    @Transactional
    public ReservationDtos.LiveTableResponse walkIn(AuthUser auth, ReservationDtos.WalkInRequest request) {
        requireStaffOperator(auth);
        authorizeBranch(auth, request.branchId());
        OffsetDateTime now = OffsetDateTime.now();
        StoreTable table = tables.findForUpdate(request.tableId(), request.branchId())
                .orElseThrow(() -> notFound("Table not found"));
        OffsetDateTime dayEnd = now.toLocalDate().plusDays(1).atStartOfDay().atOffset(now.getOffset());
        Reservation upcoming = operationalReservation(table.getId(), now, dayEnd);
        AssignmentEligibility assignment = eligibility(table, now, now.plusMinutes(1), request.playerCount(),
                windowBlock(request.branchId(), now, now.plusMinutes(1), request.playerCount()),
                sessions.findFirstByTableIdAndStatus(table.getId(), PlaySession.PlaySessionStatus.active)
                        .orElse(null), upcoming);
        if (!assignment.assignable()) throw conflict(assignment);
        if (request.userId() == null && (request.guestName() == null || request.guestName().isBlank())) {
            throw bad("A guest name or registered customer is required.", "GUEST_DETAILS_REQUIRED");
        }

        PlaySession session = new PlaySession();
        session.setBranch(table.getBranch());
        session.setTable(table);
        session.setUser(request.userId() == null ? null : users.findById(request.userId())
                .orElseThrow(() -> bad("Customer not found", "USER_NOT_FOUND")));
        session.setGuestName(trimToNull(request.guestName()));
        session.setGuestPhone(trimToNull(request.guestPhone()));
        session.setGuestEmail(trimToNull(request.guestEmail()));
        session.setPlayerCount(request.playerCount());
        session.setPricingRule(activeRule(request.branchId(), now));
        session.setCheckInAt(now);
        session.setStatus(PlaySession.PlaySessionStatus.active);
        session.setCreatedBy(auth.id());
        session.setCreatedAt(now);
        sessions.save(session);
        return live(table, session, null, "occupied",
                blocked("ACTIVE_SESSION", "An active play session is using this table."), now);
    }

    @Transactional(readOnly = true)
    public ReservationDtos.CheckoutResponse checkoutPreview(AuthUser auth, UUID id) {
        requireStaffOperator(auth);
        PlaySession session = activeSession(auth, id);
        return checkoutResponse(session, OffsetDateTime.now(), false);
    }

    @Transactional
    public ReservationDtos.CheckoutResponse checkout(AuthUser auth, UUID id,
            ReservationDtos.CheckoutRequest request) {
        requireStaffOperator(auth);
        if (request == null || !request.paymentReceived()) {
            throw bad("Confirm payment received before checkout.", "PAYMENT_CONFIRMATION_REQUIRED");
        }
        PlaySession session = activeSession(auth, id);
        OffsetDateTime checkoutAt = OffsetDateTime.now();
        session.setCheckOutAt(checkoutAt);
        session.setStatus(PlaySession.PlaySessionStatus.completed);
        session.setClosedBy(auth.id());
        session.setFinalFee(sessionFee(session, checkoutAt));
        if (session.getReservation() != null) {
            session.getReservation().setStatus(Reservation.ReservationStatus.completed);
        }
        return checkoutResponse(session, checkoutAt, true);
    }

    @Transactional(readOnly = true)
    public List<ReservationDtos.LiveTableResponse> liveTables(AuthUser auth, UUID branchId, short players) {
        authorizeBranch(auth, branchId);
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime end = now.plusMinutes(1);
        OffsetDateTime dayEnd = now.toLocalDate().plusDays(1).atStartOfDay().atOffset(now.getOffset());
        AssignmentBlock window = windowBlock(branchId, now, end, players);
        Map<UUID, PlaySession> active = sessions
                .findByBranchIdAndStatus(branchId, PlaySession.PlaySessionStatus.active).stream()
                .collect(Collectors.toMap(session -> session.getTable().getId(), session -> session));
        return tables.findByBranchIdOrderBySortOrderAsc(branchId).stream().map(table -> {
            PlaySession session = active.get(table.getId());
            Reservation reservation = operationalReservation(table.getId(), now, dayEnd);
            String state = !table.isActive()
                    || table.getOperationalStatus() == StoreTable.OperationalStatus.unavailable
                            ? "unavailable"
                            : session != null ? "occupied" : reservation != null ? "reserved" : "available";
            return live(table, session, reservation, state,
                    eligibility(table, now, end, players, window, session, reservation), now);
        }).toList();
    }

    private PlaySession activeSession(AuthUser auth, UUID id) {
        PlaySession session = sessions.findById(id).orElseThrow(() -> notFound("Session not found"));
        authorizeBranch(auth, session.getBranch().getId());
        if (session.getStatus() != PlaySession.PlaySessionStatus.active) {
            throw bad("Session is not active.", "SESSION_NOT_ACTIVE");
        }
        return session;
    }

    private ReservationDtos.StaffReservationResponse staffReservationResponse(Reservation reservation,
            OffsetDateTime now) {
        CheckInEligibility checkIn = checkInEligibility(reservation, now);
        return new ReservationDtos.StaffReservationResponse(reservation.getId(),
                reservation.getReservationNumber(), reservation.getBranch().getId(),
                reservation.getBranch().getName(), reservation.getTable().getId(),
                reservation.getTable().getCode(), reservation.getContactName(),
                reservation.getContactEmail(), reservation.getContactPhone(), reservation.getStartsAt(),
                reservation.getEndsAt(), reservation.getPlayerCount(), reservation.getStatus().name(),
                checkIn.eligible(), checkIn.reason());
    }

    private CheckInEligibility checkInEligibility(Reservation reservation, OffsetDateTime now) {
        if (!BOOKED_STATUSES.contains(reservation.getStatus())) {
            return new CheckInEligibility(false, "Reservation is not ready for check-in.");
        }
        if (now.toLocalDate().isBefore(reservation.getStartsAt().toLocalDate())) {
            return new CheckInEligibility(false, "Check-in is available on the reservation date.");
        }
        if (!now.isBefore(reservation.getEndsAt())) {
            return new CheckInEligibility(false, "The reserved time has ended.");
        }
        return new CheckInEligibility(true, null);
    }

    private boolean matches(Reservation reservation, String query) {
        if (query.isEmpty()) return true;
        return searchable(reservation.getReservationNumber(), query)
                || searchable(reservation.getContactName(), query)
                || searchable(reservation.getContactEmail(), query)
                || searchable(reservation.getContactPhone(), query)
                || searchable(reservation.getTable().getCode(), query);
    }

    private boolean searchable(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    private AssignmentEligibility eligibility(StoreTable table, OffsetDateTime start, OffsetDateTime end,
            short players, AssignmentBlock window) {
        return eligibility(table, start, end, players, window,
                sessions.findFirstByTableIdAndStatus(table.getId(), PlaySession.PlaySessionStatus.active)
                        .orElse(null), conflictingReservation(table.getId(), start, end));
    }

    private AssignmentEligibility eligibility(StoreTable table, OffsetDateTime start, OffsetDateTime end,
            short players, AssignmentBlock window, PlaySession session, Reservation reservation) {
        if (!table.isActive() || table.getOperationalStatus() != StoreTable.OperationalStatus.available) {
            return blocked("OPERATIONALLY_UNAVAILABLE", "Table is inactive or unavailable.");
        }
        if (session != null) return blocked("ACTIVE_SESSION", "An active play session is using this table.");
        if (reservation != null) {
            return blocked("RESERVATION_CONFLICT", "Reserved "
                    + reservation.getStartsAt().format(DateTimeFormatter.ofPattern("HH:mm")) + "-"
                    + reservation.getEndsAt().format(DateTimeFormatter.ofPattern("HH:mm")) + ".");
        }
        if (players < table.getMinPlayers() || players > table.getMaxPlayers()) {
            return blocked("INSUFFICIENT_CAPACITY", "Supports " + table.getMinPlayers() + "-"
                    + table.getMaxPlayers() + " players; party size is " + players + ".");
        }
        if (window != null) return blocked(window.code(), window.reason());
        if (blackouts.conflicts(table.getBranch().getId(), table.getId(), start, end)) {
            return blocked("BOOKING_BLACKOUT", "This table is blocked for the selected time.");
        }
        return new AssignmentEligibility(true, null, null);
    }

    private Reservation conflictingReservation(UUID tableId, OffsetDateTime start, OffsetDateTime end) {
        return reservations.findConflicts(tableId, start, end).stream().findFirst().orElse(null);
    }

    private Reservation operationalReservation(UUID tableId, OffsetDateTime now, OffsetDateTime dayEnd) {
        return reservations
                .findFirstByTableIdAndStatusInAndEndsAtGreaterThanAndStartsAtLessThanOrderByStartsAtAsc(
                        tableId, BOOKED_STATUSES, now, dayEnd).orElse(null);
    }

    private void validateWindow(UUID branchId, OffsetDateTime start, OffsetDateTime end, short players) {
        AssignmentBlock block = windowBlock(branchId, start, end, players);
        if (block != null) throw bad(block.reason(), block.code());
    }

    private AssignmentBlock windowBlock(UUID branchId, OffsetDateTime start, OffsetDateTime end,
            short players) {
        if (players < 1 || !end.isAfter(start) || !start.toLocalDate().equals(end.toLocalDate())) {
            return new AssignmentBlock("INVALID_RESERVATION_WINDOW",
                    "Choose a valid same-day reservation window.");
        }
        Branch branch = branches.findById(branchId).orElseThrow(() -> notFound("Branch not found"));
        if (branch.getStatus() != Branch.BranchStatus.active || !branch.isAllowReservations()) {
            return new AssignmentBlock("RESERVATIONS_UNAVAILABLE",
                    "This branch is not accepting reservations.");
        }
        short dayOfWeek = (short) (start.getDayOfWeek().getValue() - 1);
        BranchOperatingHour operatingHour = hours.findByBranchIdOrderByDayOfWeekAsc(branchId).stream()
                .filter(hour -> hour.getDayOfWeek().shortValue() == dayOfWeek).findFirst().orElse(null);
        if (operatingHour == null) {
            return new AssignmentBlock("OPERATING_HOURS_UNAVAILABLE", "Operating hours are unavailable.");
        }
        if (operatingHour.isClosed() || start.toLocalTime().isBefore(operatingHour.getOpenTime())
                || end.toLocalTime().isAfter(operatingHour.getCloseTime())) {
            String reason = operatingHour.isClosed() ? "Branch is closed today."
                    : start.toLocalTime().isBefore(operatingHour.getOpenTime()) ? "Branch opens at "
                            + operatingHour.getOpenTime().format(DateTimeFormatter.ofPattern("HH:mm")) + "."
                            : "Branch is closed for walk-ins at this time.";
            return new AssignmentBlock("OUTSIDE_BRANCH_HOURS", reason);
        }
        if (blackouts.conflicts(branchId, null, start, end)) {
            return new AssignmentBlock("BRANCH_BLACKOUT", "The branch is unavailable for that time.");
        }
        return null;
    }

    private ReservationDtos.LiveTableResponse live(StoreTable table, PlaySession session,
            Reservation reservation, String state, AssignmentEligibility assignment, OffsetDateTime now) {
        Reservation sessionReservation = session == null ? null : session.getReservation();
        Reservation contextReservation = sessionReservation != null ? sessionReservation : reservation;
        String client = session != null
                ? session.getUser() != null ? fullName(session.getUser()) : session.getGuestName()
                : reservation == null ? null : reservation.getContactName();
        long elapsed = session == null ? 0 : Math.max(0, Duration.between(session.getCheckInAt(), now).getSeconds());
        int bookedMinutes = bookedDurationMinutes(session);
        long overtime = bookedMinutes == 0 ? 0 : Math.max(0, elapsed - bookedMinutes * 60L);
        BigDecimal running = session == null ? null : sessionFee(session, now);
        return new ReservationDtos.LiveTableResponse(table.getId(), table.getCode(), table.getZone().getName(),
                table.getMinPlayers(), table.getMaxPlayers(), state, assignment.assignable(), assignment.code(),
                assignment.reason(), session == null ? null : session.getId(),
                contextReservation == null ? null : contextReservation.getId(),
                contextReservation == null ? null : contextReservation.getReservationNumber(), client,
                session != null ? session.getPlayerCount()
                        : reservation == null ? null : reservation.getPlayerCount(),
                contextReservation == null ? null : contextReservation.getStartsAt(),
                contextReservation == null ? null : contextReservation.getEndsAt(),
                session == null ? null : session.getCheckInAt(), now,
                bookedMinutes == 0 ? null : bookedMinutes, elapsed, overtime, running);
    }

    private ReservationDtos.CheckoutResponse checkoutResponse(PlaySession session, OffsetDateTime at,
            boolean completed) {
        long elapsed = Math.max(0, Duration.between(session.getCheckInAt(), at).getSeconds());
        int bookedMinutes = bookedDurationMinutes(session);
        long overtime = bookedMinutes == 0 ? 0 : Math.max(0, elapsed - bookedMinutes * 60L);
        return new ReservationDtos.CheckoutResponse(session.getId(),
                completed ? PlaySession.PlaySessionStatus.completed.name() : session.getStatus().name(),
                session.getUser() != null ? fullName(session.getUser()) : session.getGuestName(),
                session.getTable().getCode(), session.getCheckInAt(), completed ? at : null, at,
                bookedMinutes == 0 ? null : bookedMinutes, elapsed, overtime,
                completed ? session.getFinalFee() : sessionFee(session, at),
                session.getPricingRule().getCurrency());
    }

    private int bookedDurationMinutes(PlaySession session) {
        if (session == null || session.getReservation() == null) return 0;
        return Math.toIntExact(Math.max(1, Duration.between(session.getReservation().getStartsAt(),
                session.getReservation().getEndsAt()).toMinutes()));
    }

    private BigDecimal sessionFee(PlaySession session, OffsetDateTime at) {
        long elapsedSeconds = Math.max(1, Duration.between(session.getCheckInAt(), at).getSeconds());
        long bookedSeconds = session.getReservation() == null ? 0
                : Math.max(1, Duration.between(session.getReservation().getStartsAt(),
                        session.getReservation().getEndsAt()).getSeconds());
        return feeForBlocks(session.getPricingRule(), session.getPlayerCount(),
                billableBlocks(Math.max(elapsedSeconds, bookedSeconds)));
    }

    private long billableBlocks(long seconds) {
        return Math.max(1, (seconds + 3599) / 3600);
    }

    private BigDecimal feeForBlocks(BranchPricingRule rule, short players, long blocks) {
        return rule.getFirstHourPerPerson()
                .add(rule.getAdditionalHourPerPerson().multiply(BigDecimal.valueOf(blocks - 1)))
                .multiply(BigDecimal.valueOf(players)).setScale(2, RoundingMode.HALF_UP);
    }

    private BranchPricingRule activeRule(UUID branchId, OffsetDateTime at) {
        return pricing.findActiveRule(branchId, at).orElseThrow(() -> bad(
                "No active pricing rule is configured for this branch.", "PRICING_RULE_UNAVAILABLE"));
    }

    private ReservationDtos.ReservationResponse reservationResponse(Reservation reservation) {
        return new ReservationDtos.ReservationResponse(reservation.getId(), reservation.getReservationNumber(),
                reservation.getBranch().getId(), reservation.getBranch().getName(),
                reservation.getTable().getId(), reservation.getTable().getCode(), reservation.getContactName(),
                reservation.getStartsAt(), reservation.getEndsAt(), reservation.getPlayerCount(),
                reservation.getStatus().name(), reservation.getEstimatedFee(),
                reservation.getPricingRule().getCurrency());
    }

    private String fullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private AssignmentEligibility blocked(String code, String reason) {
        return new AssignmentEligibility(false, code, reason);
    }

    private void authorizeBranch(AuthUser user, UUID branchId) {
        if (user.roles().contains("admin")) return;
        if (!assignments.existsByUserIdAndBranchId(user.id(), branchId)) {
            throw new BoardlyException("You are not assigned to this branch.", 403, "BRANCH_ACCESS_DENIED");
        }
    }

    private void requireStaffOperator(AuthUser user) {
        if (!user.roles().contains("staff")) {
            throw new BoardlyException("Staff access is required for customer session operations.", 403,
                    "STAFF_OPERATION_REQUIRED");
        }
    }

    private BoardlyException bad(String message, String code) {
        return new BoardlyException(message, 422, code);
    }

    private BoardlyException conflict(AssignmentEligibility assignment) {
        return new BoardlyException(assignment.reason(), 409, assignment.code());
    }

    private BoardlyException notFound(String message) {
        return new BoardlyException(message, 404, "NOT_FOUND");
    }

    private BoardlyException unauthorized(String message) {
        return new BoardlyException(message, 401, "AUTHENTICATION_REQUIRED");
    }

    private record AssignmentBlock(String code, String reason) { }
    private record AssignmentEligibility(boolean assignable, String code, String reason) { }
    private record CheckInEligibility(boolean eligible, String reason) { }
}

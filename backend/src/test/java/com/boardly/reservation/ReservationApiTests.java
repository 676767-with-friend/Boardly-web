package com.boardly.reservation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardly.branch.BookingBlackout;
import com.boardly.branch.BookingBlackoutRepository;
import com.boardly.branch.Branch;
import com.boardly.branch.BranchOperatingHour;
import com.boardly.branch.BranchOperatingHourRepository;
import com.boardly.branch.BranchRepository;
import com.boardly.branch.StoreTable;
import com.boardly.branch.StoreTableRepository;
import com.boardly.user.Role;
import com.boardly.user.RoleRepository;
import com.boardly.user.StaffBranchAssignment;
import com.boardly.user.StaffBranchAssignmentId;
import com.boardly.user.StaffBranchAssignmentRepository;
import com.boardly.user.User;
import com.boardly.user.UserRepository;
import com.boardly.user.UserRole;
import com.boardly.user.UserRoleId;
import com.boardly.user.UserRoleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ReservationApiTests.FixedClockConfiguration.class)
@Transactional
class ReservationApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID SILOM = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final UUID CENTRAL_A1 = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final UUID CENTRAL_B1 = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    private static final String PASSWORD = "PhaseSixPassword!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private Clock clock;
    @Autowired private BookingBlackoutRepository blackouts;
    @Autowired private BranchRepository branches;
    @Autowired private BranchOperatingHourRepository operatingHours;
    @Autowired private StoreTableRepository storeTables;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private UserRoleRepository userRoles;
    @Autowired private StaffBranchAssignmentRepository assignments;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private PlaySessionRepository playSessionRepository;

    @Test
    void availabilityReservationConflictCancellationAndRoundedEstimateAreDatabaseControlled() throws Exception {
        OffsetDateTime startsAt = futureStart();
        OffsetDateTime endsAt = startsAt.plusMinutes(90);
        available(startsAt, endsAt).andExpect(jsonPath("$.tables[0].code").value("A1"))
                .andExpect(jsonPath("$.estimatedFee").value(280));

        String customerToken = registerCustomer();
        JsonNode created = createReservation(customerToken, CENTRAL_A1, startsAt, endsAt);
        org.junit.jupiter.api.Assertions.assertEquals(280, created.get("estimatedFee").asInt());

        mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(CENTRAL_A1, startsAt, endsAt)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));

        mockMvc.perform(patch("/api/reservations/{number}/cancel", created.get("reservationNumber").asText())
                        .header("Authorization", bearer(customerToken)).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Plans changed\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));
        available(startsAt, endsAt).andExpect(jsonPath("$.tables[0].code").value("A1"));
    }

    @Test
    void overlapUsesHalfOpenIntervalsSoPartialContainedAndIdenticalConflictButAdjacentIsAllowed() throws Exception {
        openAllDay(CENTRAL);
        String customerToken = registerCustomer();
        OffsetDateTime startsAt = futureStart();
        createReservation(customerToken, CENTRAL_A1, startsAt, startsAt.plusHours(2));

        for (OffsetDateTime[] interval : List.of(
                new OffsetDateTime[] { startsAt, startsAt.plusHours(2) },
                new OffsetDateTime[] { startsAt.plusHours(1), startsAt.plusHours(3) },
                new OffsetDateTime[] { startsAt.plusMinutes(30), startsAt.plusHours(1) })) {
            mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reservationBody(CENTRAL_A1, interval[0], interval[1])))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));
        }

        mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(CENTRAL_A1, startsAt.plusHours(2), startsAt.plusHours(3))))
                .andExpect(status().isOk());
    }

    @Test
    void activeReservationSessionAllowsKnownNonOverlappingFutureButOverdueSessionBlocksIt() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String customerToken = registerCustomer();
        String staffToken = createStaffToken(CENTRAL);
        OffsetDateTime now = OffsetDateTime.now(clock).withNano(0);
        JsonNode created = createReservation(customerToken, CENTRAL_A1, now.minusMinutes(1), now.plusMinutes(30));
        MvcResult checkedIn = mockMvc.perform(post("/api/staff/reservations/{id}/check-in", created.get("id").asText())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andReturn();

        available(now.plusMinutes(31), now.plusMinutes(61))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tables.length()").value(1))
                .andExpect(jsonPath("$.tables[0].code").value("A1"));

        JsonNode next = createReservation(customerToken, CENTRAL_A1, now.plusMinutes(31), now.plusMinutes(61));
        liveTables(staffToken, 2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nextReservationNumber")
                        .value(next.get("reservationNumber").asText()));

        UUID sessionId = UUID.fromString(objectMapper.readTree(checkedIn.getResponse().getContentAsString())
                .get("sessionId").asText());
        Reservation reservation = playSessionRepository.findById(sessionId).orElseThrow().getReservation();
        reservation.setStartsAt(now.minusHours(1));
        reservation.setEndsAt(now.minusMinutes(1));
        reservationRepository.saveAndFlush(reservation);

        available(now.plusHours(1), now.plusHours(2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tables.length()").value(0));
    }

    @Test
    void blackoutCapacityAndUnavailableBranchAreRejected() throws Exception {
        OffsetDateTime startsAt = futureStart();
        OffsetDateTime endsAt = startsAt.plusHours(1);
        Branch branch = branches.findById(CENTRAL).orElseThrow();
        BookingBlackout blackout = new BookingBlackout();
        blackout.setBranch(branch);
        blackout.setStartsAt(startsAt.minusMinutes(10));
        blackout.setEndsAt(endsAt.plusMinutes(10));
        blackout.setReason("Phase 6 test blackout");
        blackouts.saveAndFlush(blackout);

        mockMvc.perform(get("/api/branches/{branchId}/available-tables", CENTRAL).param("startsAt", startsAt.toString())
                        .param("endsAt", endsAt.toString()).param("players", "2"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("BRANCH_BLACKOUT"));

        mockMvc.perform(get("/api/branches/{branchId}/available-tables", CENTRAL).param("startsAt", startsAt.plusDays(1).toString())
                        .param("endsAt", endsAt.plusDays(1).toString()).param("players", "9"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tables.length()").value(0));
        openAllDay(SILOM);
        mockMvc.perform(get("/api/branches/{branchId}/available-tables", SILOM).param("startsAt", startsAt.plusDays(1).toString())
                        .param("endsAt", endsAt.plusDays(1).toString()).param("players", "2"))
                .andExpect(status().isOk());
    }

    @Test
    void staffBranchScopeCheckInWalkInCheckoutAndLiveStatusUsePersistedState() throws Exception {
        isolateCurrentOperations();
        String customerToken = registerCustomer();
        OffsetDateTime startsAt = futureStart();
        JsonNode reservation = createReservation(customerToken, CENTRAL_A1, startsAt, startsAt.plusHours(1));
        makeCheckInEligible(reservation.get("id").asText(), 60);
        String staffToken = createStaffToken(CENTRAL);
        String managerToken = createManagerToken(CENTRAL);
        String otherBranchManagerToken = createManagerToken(SILOM);
        String adminToken = createAdminToken();

        mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", SILOM).header("Authorization", bearer(staffToken)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", SILOM).header("Authorization", bearer(managerToken)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", CENTRAL).header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", CENTRAL).header("Authorization", bearer(managerToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", CENTRAL).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservation.get("id").asText())
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/staff/play-sessions/walk-in").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("branchId", CENTRAL, "tableId", CENTRAL_B1,
                                "guestName", "Customer must not assign", "playerCount", 4))))
                .andExpect(status().isForbidden());

        MvcResult checkInResult = mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservation.get("id").asText())
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("occupied")).andReturn();
        String sessionId = objectMapper.readTree(checkInResult.getResponse().getContentAsString()).get("sessionId").asText();
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(otherBranchManagerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(sessionId));
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(managerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(sessionId));
        mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", CENTRAL).header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("occupied"));
        mockMvc.perform(post("/api/staff/play-sessions/{id}/checkout", sessionId).header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"paymentReceived\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("completed"));

        openAllDay(CENTRAL);
        mockMvc.perform(post("/api/staff/play-sessions/walk-in").header("Authorization", bearer(staffToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("branchId", CENTRAL, "tableId", CENTRAL_B1, "guestName", "Walk-in Guest", "playerCount", 4))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("occupied")).andExpect(jsonPath("$.client").value("Walk-in Guest"));
    }

    @Test
    void liveTableAssignmentEligibilityExplainsIndependentBlockingConditions() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String staffToken = createStaffToken(CENTRAL);

        liveTables(staffToken, 4)
                .andExpect(jsonPath("$[0].code").value("A1"))
                .andExpect(jsonPath("$[0].status").value("available"))
                .andExpect(jsonPath("$[0].assignable").value(true))
                .andExpect(jsonPath("$[1].code").value("B1"))
                .andExpect(jsonPath("$[1].assignable").value(true));

        String customerToken = registerCustomer();
        OffsetDateTime startsAt = OffsetDateTime.now(clock).minusMinutes(1);
        JsonNode reservation = createReservation(customerToken, CENTRAL_A1, startsAt, startsAt.plusHours(1));
        liveTables(staffToken, 4)
                .andExpect(jsonPath("$[0].status").value("reserved"))
                .andExpect(jsonPath("$[0].assignable").value(false))
                .andExpect(jsonPath("$[0].assignmentBlockCode").value("RESERVATION_CONFLICT"));

        MvcResult checkedIn = mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservation.get("id").asText())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andReturn();
        liveTables(staffToken, 4)
                .andExpect(jsonPath("$[0].status").value("occupied"))
                .andExpect(jsonPath("$[0].assignable").value(false))
                .andExpect(jsonPath("$[0].assignmentBlockCode").value("ACTIVE_SESSION"));
        String sessionId = objectMapper.readTree(checkedIn.getResponse().getContentAsString()).get("sessionId").asText();
        mockMvc.perform(post("/api/staff/play-sessions/{id}/checkout", sessionId).header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"paymentReceived\":true}"))
                .andExpect(status().isOk());

        liveTables(staffToken, 7)
                .andExpect(jsonPath("$[0].assignable").value(false))
                .andExpect(jsonPath("$[0].assignmentBlockCode").value("INSUFFICIENT_CAPACITY"));

        StoreTable table = storeTables.findById(CENTRAL_A1).orElseThrow();
        table.setOperationalStatus(StoreTable.OperationalStatus.unavailable);
        storeTables.saveAndFlush(table);
        liveTables(staffToken, 4)
                .andExpect(jsonPath("$[0].status").value("unavailable"))
                .andExpect(jsonPath("$[0].assignable").value(false))
                .andExpect(jsonPath("$[0].assignmentBlockCode").value("OPERATIONALLY_UNAVAILABLE"));
    }

    @Test
    void liveTableServerTimeUsesBangkokOffset() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String staffToken = createStaffToken(CENTRAL);

        MvcResult result = liveTables(staffToken, 4).andExpect(status().isOk()).andReturn();
        OffsetDateTime serverTime = OffsetDateTime.parse(
                objectMapper.readTree(result.getResponse().getContentAsString()).get(0).get("serverTime").asText());

        org.junit.jupiter.api.Assertions.assertEquals(ZoneOffset.ofHours(7), serverTime.getOffset());
    }

    @Test
    void unavailableAndCapacityIncompatibleTablesCannotBeReserved() throws Exception {
        String customerToken = registerCustomer();
        OffsetDateTime startsAt = futureStart();
        StoreTable table = storeTables.findById(CENTRAL_A1).orElseThrow();
        table.setOperationalStatus(StoreTable.OperationalStatus.unavailable);
        storeTables.saveAndFlush(table);

        mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(CENTRAL_A1, startsAt, startsAt.plusHours(1), 2)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OPERATIONALLY_UNAVAILABLE"));
        mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(CENTRAL_B1, startsAt, startsAt.plusHours(1), 2)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INSUFFICIENT_CAPACITY"));
    }

    @Test
    void reservationRejectsInvalidPhoneWhenFrontendValidationIsBypassed() throws Exception {
        String customerToken = registerCustomer();
        OffsetDateTime startsAt = futureStart();

        mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(CENTRAL_A1, startsAt, startsAt.plusHours(1))
                                .replace("020000000", "invalid")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void reservationWindowExplainsInvalidClosedAndDisabledBranchConditions() throws Exception {
        OffsetDateTime startsAt = futureStart();

        available(startsAt, startsAt)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_RESERVATION_WINDOW"));
        available(startsAt, startsAt.plusDays(1))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_RESERVATION_WINDOW"));

        short dayOfWeek = (short) (startsAt.getDayOfWeek().getValue() - 1);
        BranchOperatingHour selectedHour = operatingHours.findByBranchIdOrderByDayOfWeekAsc(CENTRAL).stream()
                .filter(hour -> hour.getDayOfWeek().shortValue() == dayOfWeek)
                .findFirst()
                .orElseThrow();
        selectedHour.setClosed(true);
        operatingHours.saveAndFlush(selectedHour);
        available(startsAt, startsAt.plusHours(1))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OUTSIDE_BRANCH_HOURS"))
                .andExpect(jsonPath("$.message").value("Branch is closed today."));

        selectedHour.setClosed(false);
        selectedHour.setOpenTime(java.time.LocalTime.of(13, 0));
        selectedHour.setCloseTime(java.time.LocalTime.of(14, 0));
        operatingHours.saveAndFlush(selectedHour);
        available(startsAt, startsAt.plusHours(1))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OUTSIDE_BRANCH_HOURS"))
                .andExpect(jsonPath("$.message").value("Branch opens at 13:00."));
        available(startsAt.plusHours(3), startsAt.plusHours(4))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OUTSIDE_BRANCH_HOURS"))
                .andExpect(jsonPath("$.message").value("Branch is closed for walk-ins at this time."));

        operatingHours.delete(selectedHour);
        operatingHours.flush();
        available(startsAt, startsAt.plusHours(1))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OPERATING_HOURS_UNAVAILABLE"));

        Branch branch = branches.findById(CENTRAL).orElseThrow();
        branch.setAllowReservations(false);
        branches.saveAndFlush(branch);
        available(startsAt, startsAt.plusHours(1))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RESERVATIONS_UNAVAILABLE"));
    }

    @Test
    void missingReservationTableSessionAndWalkInCustomerReturnStableErrors() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String customerToken = registerCustomer();
        String staffToken = createStaffToken(CENTRAL);
        OffsetDateTime startsAt = futureStart();
        UUID missing = UUID.randomUUID();

        mockMvc.perform(get("/api/reservations/{number}", "RSV-MISSING")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(missing, startsAt, startsAt.plusHours(1))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TABLE_NOT_FOUND"));
        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", missing)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", missing)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(post("/api/staff/play-sessions/walk-in")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "branchId", CENTRAL, "tableId", missing, "guestName", "Missing Table",
                                "playerCount", 4))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(post("/api/staff/play-sessions/walk-in")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "branchId", CENTRAL, "tableId", CENTRAL_B1, "playerCount", 4))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("GUEST_DETAILS_REQUIRED"));
        mockMvc.perform(post("/api/staff/play-sessions/walk-in")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "branchId", CENTRAL, "tableId", CENTRAL_B1, "userId", missing,
                                "playerCount", 4))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void checkInRejectsUnavailableCancelledAndEndedReservations() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String customerToken = registerCustomer();
        String staffToken = createStaffToken(CENTRAL);
        JsonNode created = createReservation(customerToken, CENTRAL_A1, futureStart(), futureStart().plusHours(1));
        makeCheckInEligible(created.get("id").asText(), 60);
        Reservation reservation = reservationRepository.findById(
                UUID.fromString(created.get("id").asText())).orElseThrow();
        StoreTable table = storeTables.findById(CENTRAL_A1).orElseThrow();

        table.setOperationalStatus(StoreTable.OperationalStatus.unavailable);
        storeTables.saveAndFlush(table);
        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservation.getId())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPERATIONALLY_UNAVAILABLE"));

        table.setOperationalStatus(StoreTable.OperationalStatus.available);
        storeTables.saveAndFlush(table);
        reservation.setStatus(Reservation.ReservationStatus.cancelled);
        reservationRepository.saveAndFlush(reservation);
        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservation.getId())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_CHECKIN_READY"));

        reservation.setStatus(Reservation.ReservationStatus.confirmed);
        reservation.setStartsAt(OffsetDateTime.now(clock).minusHours(2));
        reservation.setEndsAt(OffsetDateTime.now(clock).minusMinutes(1));
        reservationRepository.saveAndFlush(reservation);
        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservation.getId())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_CHECKIN_READY"))
                .andExpect(jsonPath("$.message").value("The reserved time has ended."));
    }

    @Test
    void reservationAndSessionStateTransitionsRejectInvalidRepeatOperations() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String customerToken = registerCustomer();
        String staffToken = createStaffToken(CENTRAL);
        OffsetDateTime startsAt = futureStart();
        JsonNode futureReservation = createReservation(customerToken, CENTRAL_A1, startsAt, startsAt.plusHours(1));

        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", futureReservation.get("id").asText())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_CHECKIN_READY"));

        makeCheckInEligible(futureReservation.get("id").asText(), 60);
        MvcResult checkedIn = mockMvc.perform(post("/api/staff/reservations/{id}/check-in",
                        futureReservation.get("id").asText()).header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk())
                .andReturn();
        mockMvc.perform(post("/api/staff/reservations/{id}/check-in", futureReservation.get("id").asText())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_ALREADY_CHECKED_IN"));

        String sessionId = objectMapper.readTree(checkedIn.getResponse().getContentAsString())
                .get("sessionId").asText();
        mockMvc.perform(post("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReceived\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("SESSION_NOT_ACTIVE"));

        JsonNode cancellable = createReservation(customerToken, CENTRAL_A1, startsAt, startsAt.plusHours(1));
        mockMvc.perform(patch("/api/reservations/{number}/cancel", cancellable.get("reservationNumber").asText())
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"));
        mockMvc.perform(patch("/api/reservations/{number}/cancel", cancellable.get("reservationNumber").asText())
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_CANCELLABLE"));
    }

    @Test
    void staffReservationListCheckInPricingAndPaymentAcknowledgementUsePersistedState() throws Exception {
        isolateCurrentOperations();
        openAllDay(CENTRAL);
        String customerToken = registerCustomer();
        String staffToken = createStaffToken(CENTRAL);
        OffsetDateTime future = futureStart();
        JsonNode created = createReservation(customerToken, CENTRAL_A1, future, future.plusHours(2));
        makeCheckInEligible(created.get("id").asText(), 120);

        mockMvc.perform(get("/api/staff/branches/{branchId}/reservations", CENTRAL)
                        .header("Authorization", bearer(staffToken))
                        .param("date", OffsetDateTime.now(clock).toLocalDate().toString())
                        .param("search", created.get("reservationNumber").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reservationNumber").value(created.get("reservationNumber").asText()))
                .andExpect(jsonPath("$[0].contactName").value("Reservation Test"))
                .andExpect(jsonPath("$[0].tableCode").value("A1"))
                .andExpect(jsonPath("$[0].checkInEligible").value(true));

        MvcResult checkedIn = mockMvc.perform(post("/api/staff/reservations/{id}/check-in", created.get("id").asText())
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.bookedDurationMinutes").value(120))
                .andReturn();
        UUID sessionId = UUID.fromString(objectMapper.readTree(checkedIn.getResponse().getContentAsString())
                .get("sessionId").asText());
        PlaySession session = playSessionRepository.findById(sessionId).orElseThrow();
        Reservation reservation = session.getReservation();

        session.setCheckInAt(OffsetDateTime.now(clock).minusMinutes(119));
        reservation.setEndsAt(OffsetDateTime.now(clock).plusMinutes(1));
        reservationRepository.saveAndFlush(reservation);
        playSessionRepository.saveAndFlush(session);
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.finalFee").value(280));

        session.setCheckInAt(OffsetDateTime.now(clock).minusMinutes(121));
        reservation.setEndsAt(OffsetDateTime.now(clock).minusSeconds(1));
        reservationRepository.saveAndFlush(reservation);
        playSessionRepository.saveAndFlush(session);
        mockMvc.perform(get("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.finalFee").value(400))
                .andExpect(jsonPath("$.overtimeSeconds").isNumber());

        mockMvc.perform(post("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(staffToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReceived\":false}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_CONFIRMATION_REQUIRED"));
        mockMvc.perform(post("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(staffToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReceived\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.finalFee").value(400));
    }

    private org.springframework.test.web.servlet.ResultActions liveTables(String token, int players) throws Exception {
        return mockMvc.perform(get("/api/staff/branches/{branchId}/live-tables", CENTRAL)
                .header("Authorization", bearer(token)).param("players", String.valueOf(players)));
    }

    private void openAllDay(UUID branchId) {
        List<BranchOperatingHour> hours = operatingHours.findByBranchIdOrderByDayOfWeekAsc(branchId);
        hours.forEach(hour -> { hour.setClosed(false); hour.setOpenTime(java.time.LocalTime.MIN); hour.setCloseTime(java.time.LocalTime.of(23, 59)); });
        operatingHours.saveAll(hours);
    }

    private org.springframework.test.web.servlet.ResultActions available(OffsetDateTime startsAt, OffsetDateTime endsAt) throws Exception {
        return mockMvc.perform(get("/api/branches/{branchId}/available-tables", CENTRAL).param("startsAt", startsAt.toString())
                .param("endsAt", endsAt.toString()).param("players", "2"));
    }

    private JsonNode createReservation(String token, UUID tableId, OffsetDateTime startsAt, OffsetDateTime endsAt) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/reservations").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content(reservationBody(tableId, startsAt, endsAt)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String registerCustomer() throws Exception {
        String email = "reservation-customer-" + UUID.randomUUID() + "@example.test";
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Reservation\",\"lastName\":\"Test\",\"email\":\"%s\",\"password\":\"%s\",\"acceptTerms\":true,\"acceptPrivacy\":true}".formatted(email, PASSWORD)))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String createStaffToken(UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now(clock);
        User staff = new User();
        staff.setFirstName("Reservation"); staff.setLastName("Test Staff"); staff.setEmail("reservation-staff-" + UUID.randomUUID() + "@example.test");
        staff.setPasswordHash(passwordEncoder.encode(PASSWORD)); staff.setStatus(User.UserStatus.active); staff.setCreatedAt(now); staff.setUpdatedAt(now);
        staff = users.save(staff);
        Role staffRole = roles.findByCodeAndIsActiveTrue("staff").orElseThrow();
        UserRole role = new UserRole(); role.setId(new UserRoleId(staff.getId(), staffRole.getId())); role.setUser(staff); role.setRole(staffRole); role.setAssignedAt(now); userRoles.save(role);
        StaffBranchAssignment assignment = new StaffBranchAssignment(); assignment.setId(new StaffBranchAssignmentId(staff.getId(), branchId)); assignment.setUser(staff); assignment.setBranch(branches.findById(branchId).orElseThrow()); assignment.setAssignedAt(now); assignment.setPrimary(true); assignments.save(assignment);
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}".formatted(staff.getEmail(), PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String createManagerToken(UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now(clock);
        User manager = new User();
        manager.setFirstName("Reservation"); manager.setLastName("Test Manager"); manager.setEmail("reservation-manager-" + UUID.randomUUID() + "@example.test");
        manager.setPasswordHash(passwordEncoder.encode(PASSWORD)); manager.setStatus(User.UserStatus.active); manager.setCreatedAt(now); manager.setUpdatedAt(now);
        manager = users.save(manager);
        Role managerRole = roles.findByCodeAndIsActiveTrue("manager").orElseThrow();
        UserRole role = new UserRole(); role.setId(new UserRoleId(manager.getId(), managerRole.getId())); role.setUser(manager); role.setRole(managerRole); role.setAssignedAt(now); userRoles.save(role);
        if (branchId != null) {
            StaffBranchAssignment assignment = new StaffBranchAssignment(); assignment.setId(new StaffBranchAssignmentId(manager.getId(), branchId)); assignment.setUser(manager); assignment.setBranch(branches.findById(branchId).orElseThrow()); assignment.setAssignedAt(now); assignment.setPrimary(true); assignments.save(assignment);
        }
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}".formatted(manager.getEmail(), PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String createAdminToken() throws Exception {
        OffsetDateTime now = OffsetDateTime.now(clock);
        User admin = new User();
        admin.setFirstName("Reservation"); admin.setLastName("Test Admin");
        admin.setEmail("reservation-admin-" + UUID.randomUUID() + "@example.test");
        admin.setPasswordHash(passwordEncoder.encode(PASSWORD)); admin.setStatus(User.UserStatus.active);
        admin.setCreatedAt(now); admin.setUpdatedAt(now); admin = users.save(admin);
        Role adminRole = roles.findByCodeAndIsActiveTrue("admin").orElseThrow();
        UserRole role = new UserRole(); role.setId(new UserRoleId(admin.getId(), adminRole.getId()));
        role.setUser(admin); role.setRole(adminRole); role.setAssignedAt(now); userRoles.save(role);
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}"
                                .formatted(admin.getEmail(), PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String reservationBody(UUID tableId, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        return reservationBody(tableId, startsAt, endsAt, 2);
    }

    private String reservationBody(UUID tableId, OffsetDateTime startsAt, OffsetDateTime endsAt, int players) {
        return "{\"branchId\":\"%s\",\"tableId\":\"%s\",\"contactName\":\"Reservation Test\",\"contactPhone\":\"020000000\",\"contactEmail\":\"reservation@example.test\",\"startsAt\":\"%s\",\"endsAt\":\"%s\",\"playerCount\":%s}".formatted(CENTRAL, tableId, startsAt, endsAt, players);
    }

    private OffsetDateTime futureStart() {
        return OffsetDateTime.now(clock).plusDays(14).withHour(12).withMinute(0).withSecond(0).withNano(0);
    }

    private void makeCheckInEligible(String reservationId, int durationMinutes) {
        Reservation reservation = reservationRepository.findById(UUID.fromString(reservationId)).orElseThrow();
        OffsetDateTime startsAt = OffsetDateTime.now(clock).minusMinutes(1);
        reservation.setStartsAt(startsAt);
        reservation.setEndsAt(startsAt.plusMinutes(durationMinutes));
        reservationRepository.saveAndFlush(reservation);
    }

    private void isolateCurrentOperations() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime dayEnd = now.toLocalDate().plusDays(1).atStartOfDay().atOffset(now.getOffset());
        reservationRepository.findAll().stream()
                .filter(item -> item.getBranch().getId().equals(CENTRAL))
                .filter(item -> List.of(Reservation.ReservationStatus.pending,
                        Reservation.ReservationStatus.confirmed).contains(item.getStatus()))
                .filter(item -> item.getEndsAt().isAfter(now) && item.getStartsAt().isBefore(dayEnd))
                .forEach(item -> item.setStatus(Reservation.ReservationStatus.cancelled));
        playSessionRepository.findByBranchIdAndStatus(CENTRAL, PlaySession.PlaySessionStatus.active)
                .forEach(item -> item.setStatus(PlaySession.PlaySessionStatus.cancelled));
        reservationRepository.flush();
        playSessionRepository.flush();
    }

    private String bearer(String token) { return "Bearer " + token; }

    @TestConfiguration
    static class FixedClockConfiguration {
        @Bean
        @Primary
        Clock reservationApiClock() {
            return Clock.fixed(Instant.parse("2026-10-28T05:00:00Z"), ZoneId.of("Asia/Bangkok"));
        }
    }
}

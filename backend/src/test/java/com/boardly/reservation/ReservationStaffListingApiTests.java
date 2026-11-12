package com.boardly.reservation;

import com.boardly.auth.AuthUser;
import com.boardly.branch.BranchOperatingHour;
import com.boardly.branch.BranchOperatingHourRepository;
import com.boardly.branch.BranchRepository;
import com.boardly.common.exception.BoardlyException;
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
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ReservationService coverage, part 3: the staff reservation list (search over every contact field, date
 * filter, cancelled bookings hidden, check-in eligibility reasons), customer ownership and cancellation
 * details, and the role/branch guards inside the service (called directly, because the security filter
 * stops customers before they reach them over HTTP).
 * Complements ReservationApiTests; it does not change it.
 *
 * Time is fixed at 2026-10-28 12:00 Bangkok. Needs the dev seed data (Central branch, tables A1 and B1).
 * Every test is @Transactional, so all data is rolled back after each case.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ReservationStaffListingApiTests.FixedClockConfiguration.class)
@Transactional
class ReservationStaffListingApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID SILOM = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final UUID CENTRAL_A1 = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final UUID CENTRAL_B1 = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    private static final String PASSWORD = "ReservationListingPassword!2026";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired Clock clock;
    @Autowired ReservationService service;
    @Autowired ReservationRepository reservationRepository;
    @Autowired PlaySessionRepository playSessionRepository;
    @Autowired BranchOperatingHourRepository operatingHours;
    @Autowired BranchRepository branches;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired StaffBranchAssignmentRepository assignments;
    @Autowired PasswordEncoder passwordEncoder;

    // ------------------------------------------------------------------ staff reservation list

    @Test
    void staffReservationListSearchesEveryContactFieldFiltersByDateAndExplainsCheckIn() throws Exception {
        isolateCentralForTwoDays();
        openAllDay(CENTRAL);
        // no letter "a" in the marker, so it can never accidentally match the table-code search "A1" below
        String marker = UUID.randomUUID().toString().substring(0, 8).replace('a', 'x');
        String customer = registerCustomer();
        String staff = createStaffToken(CENTRAL);

        JsonNode alice = create(customer, CENTRAL_A1, 14, "Alice " + marker, "alice-" + marker + "@example.test", "020111111");
        JsonNode bob = create(customer, CENTRAL_B1, 14, "Bob " + marker, "bob-" + marker + "@example.test", "020222222");
        JsonNode carol = create(customer, CENTRAL_A1, 15, "Carol " + marker, "carol-" + marker + "@example.test", "020333333");
        JsonNode dave = create(customer, CENTRAL_B1, 15, "Dave " + marker, "dave-" + marker + "@example.test", "020444444");
        move(alice, 0, 14, 16);   // later today: can be checked in
        move(bob, 0, 8, 10);      // earlier today: the reserved time has ended
        move(carol, 1, 19, 20);   // tomorrow: not today yet
        move(dave, 0, 17, 19);    // later today, but cancelled below
        mockMvc.perform(auth(patch("/api/reservations/{number}/cancel", dave.get("reservationNumber").asText()), customer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));

        LocalDate today = OffsetDateTime.now(clock).toLocalDate();
        String aliceId = alice.get("id").asText();
        String bobId = bob.get("id").asText();

        // the default is today; carol (tomorrow) and dave (cancelled) are left out, oldest start first
        assertEquals(List.of(bobId, aliceId), ids(staffList(staff, null, marker)));
        assertEquals(List.of(bobId, aliceId), ids(staffList(staff, today, marker)));
        assertFalse(ids(staffList(staff, today, null)).contains(dave.get("id").asText()));

        // every contact field is searchable, ignoring case and surrounding spaces
        assertEquals(List.of(aliceId), ids(staffList(staff, today, alice.get("reservationNumber").asText().toLowerCase())));
        assertEquals(List.of(aliceId), ids(staffList(staff, today, "ALICE " + marker)));
        assertEquals(List.of(aliceId), ids(staffList(staff, today, "  alice " + marker + "  ")));
        assertEquals(List.of(bobId), ids(staffList(staff, today, "bob-" + marker)));
        List<String> byPhone = ids(staffList(staff, today, "020222222"));
        assertTrue(byPhone.contains(bobId));
        assertFalse(byPhone.contains(aliceId));
        List<String> byTable = ids(staffList(staff, today, "A1"));
        assertTrue(byTable.contains(aliceId));
        assertFalse(byTable.contains(bobId));
        assertTrue(ids(staffList(staff, today, "zz-" + marker)).isEmpty());

        // listed details come from the stored reservation
        JsonNode aliceRow = staffList(staff, today, "alice-" + marker).get(0);
        assertEquals("Alice " + marker, aliceRow.path("contactName").asText());
        assertEquals("alice-" + marker + "@example.test", aliceRow.path("contactEmail").asText());
        assertEquals("020111111", aliceRow.path("contactPhone").asText());
        assertEquals("A1", aliceRow.path("tableCode").asText());
        assertEquals(CENTRAL.toString(), aliceRow.path("branchId").asText());
        assertEquals(4, aliceRow.path("playerCount").asInt());

        // check-in eligibility and the reason when it is not allowed
        assertTrue(aliceRow.path("checkInEligible").asBoolean());
        assertTrue(aliceRow.path("checkInBlockReason").isNull());
        JsonNode bobRow = staffList(staff, today, "bob-" + marker).get(0);
        assertFalse(bobRow.path("checkInEligible").asBoolean());
        assertEquals("The reserved time has ended.", bobRow.path("checkInBlockReason").asText());

        // another day shows that day's bookings only
        JsonNode tomorrow = staffList(staff, today.plusDays(1), marker);
        assertEquals(List.of(carol.get("id").asText()), ids(tomorrow));
        assertFalse(tomorrow.get(0).path("checkInEligible").asBoolean());
        assertEquals("Check-in is available on the reservation date.",
                tomorrow.get(0).path("checkInBlockReason").asText());
        assertFalse(ids(staffList(staff, today.plusDays(1), marker)).contains(aliceId));
    }

    // ------------------------------------------------------------------ ownership and cancellation

    @Test
    void customersSeeAndCancelOnlyTheirOwnReservationsAndCancellationDetailsAreStored() throws Exception {
        openAllDay(CENTRAL);
        String owner = registerCustomer();
        String other = registerCustomer();
        JsonNode withReason = create(owner, CENTRAL_A1, 14, "Owner One", "owner@example.test", "020555555");
        JsonNode withoutBody = create(owner, CENTRAL_B1, 15, "Owner Two", "owner@example.test", "020555555");
        String reasonNumber = withReason.get("reservationNumber").asText();
        String bodylessNumber = withoutBody.get("reservationNumber").asText();

        // someone else's reservation looks like it does not exist
        mockMvc.perform(auth(get("/api/reservations/{number}", reasonNumber), owner)).andExpect(status().isOk());
        mockMvc.perform(auth(get("/api/reservations/{number}", reasonNumber), other)).andExpect(status().isNotFound());
        mockMvc.perform(auth(patch("/api/reservations/{number}/cancel", reasonNumber), other))
                .andExpect(status().isNotFound());

        // the list holds the owner's reservations, newest start first, and nobody else's
        List<String> mine = ids(body(mockMvc.perform(auth(get("/api/reservations/me"), owner))
                .andExpect(status().isOk()).andReturn()));
        assertTrue(mine.indexOf(withoutBody.get("id").asText()) >= 0);
        assertTrue(mine.indexOf(withoutBody.get("id").asText()) < mine.indexOf(withReason.get("id").asText()));
        List<String> others = ids(body(mockMvc.perform(auth(get("/api/reservations/me"), other))
                .andExpect(status().isOk()).andReturn()));
        assertFalse(others.contains(withReason.get("id").asText()));

        // cancelling with a reason stores the reason and the time
        mockMvc.perform(auth(patch("/api/reservations/{number}/cancel", reasonNumber), owner)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Change of plans\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));
        Reservation reasoned = reservationRepository.findById(UUID.fromString(withReason.get("id").asText())).orElseThrow();
        assertEquals("Change of plans", reasoned.getCancellationReason());
        assertEquals(OffsetDateTime.now(clock).toInstant(), reasoned.getCancelledAt().toInstant());

        // cancelling with no body at all is allowed and stores no reason
        mockMvc.perform(auth(patch("/api/reservations/{number}/cancel", bodylessNumber), owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));
        Reservation bodyless = reservationRepository.findById(UUID.fromString(withoutBody.get("id").asText())).orElseThrow();
        assertNull(bodyless.getCancellationReason());
        assertNotNull(bodyless.getCancelledAt());

        // a cancelled reservation cannot be cancelled again
        mockMvc.perform(auth(patch("/api/reservations/{number}/cancel", bodylessNumber), owner))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("RESERVATION_NOT_CANCELLABLE"));
    }

    // ------------------------------------------------------------------ guards inside the service

    @Test
    void serviceRejectsNonStaffCallersAndStaffOutsideTheirBranch() {
        AuthUser customer = principal("customer");
        UUID someId = UUID.randomUUID();
        assertCode("STAFF_OPERATION_REQUIRED", () -> service.staffReservations(customer, CENTRAL, null, null));
        assertCode("STAFF_OPERATION_REQUIRED", () -> service.checkIn(customer, someId));
        assertCode("STAFF_OPERATION_REQUIRED", () -> service.walkIn(customer, null));
        assertCode("STAFF_OPERATION_REQUIRED", () -> service.checkoutPreview(customer, someId));
        assertCode("STAFF_OPERATION_REQUIRED", () -> service.checkout(customer, someId, null));

        // staff who are not assigned to the branch are refused for that branch
        AuthUser unassigned = principal("staff");
        assertCode("BRANCH_ACCESS_DENIED", () -> service.staffReservations(unassigned, CENTRAL, null, null));
        assertCode("BRANCH_ACCESS_DENIED", () -> service.liveTables(unassigned, CENTRAL, (short) 2));

        // an admin is not limited to a branch
        AuthUser admin = principal("admin");
        assertNotNull(service.staffReservations(admin, SILOM, null, null));
        assertNotNull(service.liveTables(admin, CENTRAL, (short) 2));
    }

    // ------------------------------------------------------------------ helpers

    private void assertCode(String code, Executable call) {
        BoardlyException error = assertThrows(BoardlyException.class, call);
        assertEquals(code, error.getCode());
        assertEquals(403, error.getStatus());
    }

    private AuthUser principal(String... roleCodes) {
        return new AuthUser(UUID.randomUUID(), "direct-" + UUID.randomUUID() + "@example.test",
                List.of(roleCodes), List.of(), List.of());
    }

    private JsonNode staffList(String token, LocalDate date, String search) throws Exception {
        MockHttpServletRequestBuilder request = auth(get("/api/staff/branches/{branchId}/reservations", CENTRAL), token);
        if (date != null) {
            request.param("date", date.toString());
        }
        if (search != null) {
            request.param("search", search);
        }
        return body(mockMvc.perform(request).andExpect(status().isOk()).andReturn());
    }

    private List<String> ids(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(node -> values.add(node.path("id").asText()));
        return values;
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder builder, String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    private OffsetDateTime at(int dayOffset, int hour) {
        return OffsetDateTime.now(clock).plusDays(dayOffset).withHour(hour).withMinute(0).withSecond(0).withNano(0);
    }

    private JsonNode create(String token, UUID tableId, int daysAhead, String name, String email, String phone) throws Exception {
        OffsetDateTime start = at(daysAhead, 12);
        String content = "{\"branchId\":\"%s\",\"tableId\":\"%s\",\"contactName\":\"%s\",\"contactPhone\":\"%s\",\"contactEmail\":\"%s\",\"startsAt\":\"%s\",\"endsAt\":\"%s\",\"playerCount\":4}"
                .formatted(CENTRAL, tableId, name, phone, email, start, start.plusHours(2));
        return body(mockMvc.perform(auth(post("/api/reservations"), token).contentType(MediaType.APPLICATION_JSON)
                .content(content)).andExpect(status().isOk()).andReturn());
    }

    /** Moves a stored reservation to another day and hour; the API only books ahead, so tests rewrite the time. */
    private void move(JsonNode created, int dayOffset, int startHour, int endHour) {
        Reservation reservation = reservationRepository.findById(UUID.fromString(created.get("id").asText())).orElseThrow();
        reservation.setStartsAt(at(dayOffset, startHour));
        reservation.setEndsAt(at(dayOffset, endHour));
        reservationRepository.saveAndFlush(reservation);
    }

    private void openAllDay(UUID branchId) {
        List<BranchOperatingHour> hours = operatingHours.findByBranchIdOrderByDayOfWeekAsc(branchId);
        hours.forEach(hour -> {
            hour.setClosed(false);
            hour.setOpenTime(LocalTime.MIN);
            hour.setCloseTime(LocalTime.of(23, 59));
        });
        operatingHours.saveAll(hours);
    }

    /** Cancels anything already booked at Central today and tomorrow so the moved test bookings cannot clash. */
    private void isolateCentralForTwoDays() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime dayStart = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
        OffsetDateTime windowEnd = dayStart.plusDays(2);
        reservationRepository.findAll().stream()
                .filter(item -> item.getBranch().getId().equals(CENTRAL))
                .filter(item -> List.of(Reservation.ReservationStatus.pending,
                        Reservation.ReservationStatus.confirmed).contains(item.getStatus()))
                .filter(item -> item.getEndsAt().isAfter(dayStart) && item.getStartsAt().isBefore(windowEnd))
                .forEach(item -> item.setStatus(Reservation.ReservationStatus.cancelled));
        playSessionRepository.findByBranchIdAndStatus(CENTRAL, PlaySession.PlaySessionStatus.active)
                .forEach(item -> item.setStatus(PlaySession.PlaySessionStatus.cancelled));
        reservationRepository.flush();
        playSessionRepository.flush();
    }

    private String registerCustomer() throws Exception {
        String email = "res-listing-cust-" + UUID.randomUUID() + "@example.test";
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Reservation\",\"lastName\":\"Test\",\"email\":\"%s\",\"password\":\"%s\",\"acceptTerms\":true,\"acceptPrivacy\":true}"
                                .formatted(email, PASSWORD)))
                .andExpect(status().isCreated()).andReturn();
        return body(result).get("accessToken").asText();
    }

    private String createStaffToken(UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now(clock);
        User staff = new User();
        staff.setFirstName("Reservation");
        staff.setLastName("Listing Staff");
        staff.setEmail("res-listing-staff-" + UUID.randomUUID() + "@example.test");
        staff.setPasswordHash(passwordEncoder.encode(PASSWORD));
        staff.setStatus(User.UserStatus.active);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        staff = users.save(staff);

        Role staffRole = roles.findByCodeAndIsActiveTrue("staff").orElseThrow();
        UserRole role = new UserRole();
        role.setId(new UserRoleId(staff.getId(), staffRole.getId()));
        role.setUser(staff);
        role.setRole(staffRole);
        role.setAssignedAt(now);
        userRoles.save(role);

        StaffBranchAssignment assignment = new StaffBranchAssignment();
        assignment.setId(new StaffBranchAssignmentId(staff.getId(), branchId));
        assignment.setUser(staff);
        assignment.setBranch(branches.findById(branchId).orElseThrow());
        assignment.setAssignedAt(now);
        assignment.setPrimary(true);
        assignments.save(assignment);

        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}"
                                .formatted(staff.getEmail(), PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        return body(login).get("accessToken").asText();
    }

    @TestConfiguration
    static class FixedClockConfiguration {
        @Bean
        @Primary
        Clock reservationListingClock() {
            return Clock.fixed(Instant.parse("2026-10-28T05:00:00Z"), ZoneId.of("Asia/Bangkok"));
        }
    }
}

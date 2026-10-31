package com.boardly.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ReservationConcurrencyApiTests.FixedClockConfiguration.class)
class ReservationConcurrencyApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID CENTRAL_A1 = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-28T12:00:00+07:00");
    private static final String MARKER = "Phase3 concurrency ";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired Phase3Clock clock;

    private final List<UUID> createdUsers = new ArrayList<>();

    @BeforeEach
    void resetClock() {
        clock.set(NOW.toInstant());
    }

    @AfterEach
    void removeTestData() {
        jdbcTemplate.update("delete from notifications where play_session_id in "
                + "(select id from play_sessions where guest_name like ?)", MARKER + "%");
        jdbcTemplate.update("delete from notifications where reservation_id in "
                + "(select id from reservations where contact_name like ?)", MARKER + "%");
        jdbcTemplate.update("delete from play_sessions where guest_name like ? or reservation_id in "
                + "(select id from reservations where contact_name like ?)", MARKER + "%", MARKER + "%");
        jdbcTemplate.update("delete from reservations where contact_name like ?", MARKER + "%");
        for (UUID userId : createdUsers) {
            jdbcTemplate.update("delete from password_reset_tokens where user_id = ?", userId);
            jdbcTemplate.update("delete from auth_sessions where user_id = ?", userId);
            jdbcTemplate.update("delete from user_consents where user_id = ?", userId);
            jdbcTemplate.update("delete from user_roles where user_id = ?", userId);
            jdbcTemplate.update("delete from users where id = ?", userId);
        }
    }

    @Test
    void simultaneousIdenticalReservationsCreateOneRowAndReturnOneConflict() throws Exception {
        Account first = registerCustomer();
        Account second = registerCustomer();
        OffsetDateTime startsAt = NOW.plusDays(14);
        String body = reservationBody(startsAt, startsAt.plusHours(1), MARKER + "reservation");

        List<MvcResult> results = concurrently(
                () -> createReservation(first.token(), body),
                () -> createReservation(second.token(), body));

        assertEquals(List.of(200, 409), statuses(results));
        MvcResult conflict = results.stream().filter(result -> result.getResponse().getStatus() == 409)
                .findFirst().orElseThrow();
        assertEquals("RESERVATION_CONFLICT",
                objectMapper.readTree(conflict.getResponse().getContentAsString()).path("code").asText());
        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from reservations where table_id = ? and starts_at < ? and ends_at > ? "
                        + "and status not in ('cancelled', 'completed', 'no_show') and contact_name = ?",
                Integer.class, CENTRAL_A1, startsAt.plusHours(1), startsAt, MARKER + "reservation"));
    }

    @Test
    void concurrentWalkInAndUpcomingReservationProduceOneTableOperation() throws Exception {
        Account customer = registerCustomer();
        String staffToken = login("staff@boardly.com", "staff");
        OffsetDateTime startsAt = NOW.plusMinutes(10);
        String reservation = reservationBody(startsAt, startsAt.plusHours(1), MARKER + "upcoming");
        String walkIn = """
                {"branchId":"%s","tableId":"%s","guestName":"%swalk-in","playerCount":2}
                """.formatted(CENTRAL, CENTRAL_A1, MARKER);

        List<MvcResult> results = concurrently(
                () -> createReservation(customer.token(), reservation),
                () -> mockMvc.perform(post("/api/staff/play-sessions/walk-in")
                                .header("Authorization", bearer(staffToken)).contentType(MediaType.APPLICATION_JSON)
                                .content(walkIn)).andReturn());

        assertEquals(List.of(200, 409), statuses(results));
        assertEquals(1, jdbcTemplate.queryForObject(
                "select (select count(*) from reservations where contact_name = ?) + "
                        + "(select count(*) from play_sessions where guest_name = ?)",
                Integer.class, MARKER + "upcoming", MARKER + "walk-in"));
    }

    @Test
    void concurrentCheckInSerializesOnReservationAndCreatesOneSession() throws Exception {
        Account customer = registerCustomer();
        String staffToken = login("staff@boardly.com", "staff");
        String body = reservationBody(NOW.minusMinutes(1), NOW.plusHours(1), MARKER + "check-in");
        MvcResult created = createReservation(customer.token(), body);
        UUID reservationId = UUID.fromString(objectMapper.readTree(created.getResponse().getContentAsString())
                .path("id").asText());

        List<MvcResult> results = concurrently(
                () -> checkIn(staffToken, reservationId),
                () -> checkIn(staffToken, reservationId));

        assertEquals(List.of(200, 409), statuses(results));
        MvcResult conflict = results.stream().filter(result -> result.getResponse().getStatus() == 409)
                .findFirst().orElseThrow();
        assertEquals("RESERVATION_ALREADY_CHECKED_IN",
                objectMapper.readTree(conflict.getResponse().getContentAsString()).path("code").asText());
        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from play_sessions where reservation_id = ?", Integer.class, reservationId));
    }

    @Test
    void concurrentCheckoutCompletesOnceAndRejectsTheDuplicateConfirmation() throws Exception {
        Account customer = registerCustomer();
        String staffToken = login("staff@boardly.com", "staff");
        MvcResult created = createReservation(customer.token(),
                reservationBody(NOW.minusMinutes(1), NOW.plusMinutes(30), MARKER + "checkout"));
        UUID reservationId = UUID.fromString(objectMapper.readTree(created.getResponse().getContentAsString())
                .path("id").asText());
        MvcResult checkedIn = checkIn(staffToken, reservationId);
        UUID sessionId = UUID.fromString(objectMapper.readTree(checkedIn.getResponse().getContentAsString())
                .path("sessionId").asText());

        List<MvcResult> results = concurrently(
                () -> checkout(staffToken, sessionId),
                () -> checkout(staffToken, sessionId));

        assertEquals(List.of(200, 422), statuses(results));
        MvcResult rejected = results.stream().filter(result -> result.getResponse().getStatus() == 422)
                .findFirst().orElseThrow();
        assertEquals("SESSION_NOT_ACTIVE",
                objectMapper.readTree(rejected.getResponse().getContentAsString()).path("code").asText());
        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from play_sessions where id = ? and status = 'completed' and final_fee is not null",
                Integer.class, sessionId));
    }

    @Test
    void previewUsesSharedPricingAndFinalCheckoutRecalculatesAtConfirmationTime() throws Exception {
        Account customer = registerCustomer();
        String staffToken = login("staff@boardly.com", "staff");
        MvcResult created = createReservation(customer.token(),
                reservationBody(NOW.minusMinutes(1), NOW.plusMinutes(30), MARKER + "recalculation"));
        UUID reservationId = UUID.fromString(objectMapper.readTree(created.getResponse().getContentAsString())
                .path("id").asText());
        UUID sessionId = UUID.fromString(objectMapper.readTree(
                        checkIn(staffToken, reservationId).getResponse().getContentAsString())
                .path("sessionId").asText());

        JsonNode preview = objectMapper.readTree(mockMvc.perform(
                        get("/api/staff/play-sessions/{id}/checkout", sessionId)
                                .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(160, preview.path("baseFee").asInt());
        assertEquals(0, preview.path("overtimeFee").asInt());
        assertEquals(160, preview.path("finalFee").asInt());

        clock.set(NOW.plusMinutes(30).plusSeconds(1).toInstant());
        JsonNode completed = objectMapper.readTree(checkout(staffToken, sessionId)
                .getResponse().getContentAsString());
        assertEquals(160, completed.path("baseFee").asInt());
        assertEquals(120, completed.path("overtimeFee").asInt());
        assertEquals(280, completed.path("finalFee").asInt());
    }

    private MvcResult createReservation(String token, String body) throws Exception {
        return mockMvc.perform(post("/api/reservations").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn();
    }

    private MvcResult checkIn(String token, UUID reservationId) throws Exception {
        return mockMvc.perform(post("/api/staff/reservations/{id}/check-in", reservationId)
                        .header("Authorization", bearer(token)))
                .andReturn();
    }

    private MvcResult checkout(String token, UUID sessionId) throws Exception {
        return mockMvc.perform(post("/api/staff/play-sessions/{id}/checkout", sessionId)
                        .header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReceived\":true}"))
                .andReturn();
    }

    private List<MvcResult> concurrently(Request first, Request second) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<MvcResult>> futures = List.of(
                    executor.submit(() -> runWhenReleased(first, ready, start)),
                    executor.submit(() -> runWhenReleased(second, ready, start)));
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            List<MvcResult> results = new ArrayList<>();
            for (Future<MvcResult> future : futures) results.add(future.get(60, TimeUnit.SECONDS));
            return results;
        } finally {
            start.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    private MvcResult runWhenReleased(Request request, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent request did not start");
        return request.run();
    }

    private List<Integer> statuses(List<MvcResult> results) {
        return results.stream().map(result -> result.getResponse().getStatus()).sorted().toList();
    }

    private Account registerCustomer() throws Exception {
        String email = "phase3-concurrency-" + UUID.randomUUID() + "@boardly.test";
        String body = """
                {"firstName":"Phase3","lastName":"Concurrency","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email);
        JsonNode response = objectMapper.readTree(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        Account account = new Account(UUID.fromString(response.at("/user/id").asText()),
                response.path("accessToken").asText());
        createdUsers.add(account.id());
        return account;
    }

    private String login(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s","rememberMe":false}
                """.formatted(email, password);
        JsonNode response = objectMapper.readTree(mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        return response.path("accessToken").asText();
    }

    private String reservationBody(OffsetDateTime startsAt, OffsetDateTime endsAt, String contactName) {
        return """
                {"branchId":"%s","tableId":"%s","contactName":"%s","contactEmail":"phase3@example.test","startsAt":"%s","endsAt":"%s","playerCount":2}
                """.formatted(CENTRAL, CENTRAL_A1, contactName, startsAt, endsAt);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    @FunctionalInterface
    private interface Request {
        MvcResult run() throws Exception;
    }

    private record Account(UUID id, String token) { }

    @TestConfiguration
    static class FixedClockConfiguration {
        @Bean
        @Primary
        Phase3Clock phase3Clock() {
            return new Phase3Clock(Instant.parse("2026-10-28T05:00:00Z"), ZoneId.of("Asia/Bangkok"));
        }
    }

    static class Phase3Clock extends Clock {
        private final AtomicReference<Instant> current;
        private final ZoneId zone;

        Phase3Clock(Instant current, ZoneId zone) {
            this.current = new AtomicReference<>(current);
            this.zone = zone;
        }

        void set(Instant instant) {
            current.set(instant);
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId nextZone) {
            return Clock.fixed(current.get(), nextZone);
        }

        @Override
        public Instant instant() {
            return current.get();
        }
    }
}

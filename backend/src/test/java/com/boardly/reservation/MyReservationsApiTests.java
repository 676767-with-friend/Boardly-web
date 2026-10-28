package com.boardly.reservation;

import com.boardly.branch.BranchOperatingHour;
import com.boardly.branch.BranchOperatingHourRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Covers GET /api/reservations/me, which had no test. Needs the dev seed data. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MyReservationsApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID CENTRAL_A1 = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final String PASSWORD = "MyReservationsPassword!2026";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BranchOperatingHourRepository operatingHours;
    @Autowired PlaySessionRepository playSessions;

    @Test
    void myReservationsListsOnlyTheCallersReservations() throws Exception {
        openAllDay(CENTRAL);
        // A table with a running session is blocked for every booking time, so clear any left over in the dev DB.
        playSessions.findByBranchIdAndStatus(CENTRAL, PlaySession.PlaySessionStatus.active)
                .forEach(item -> item.setStatus(PlaySession.PlaySessionStatus.cancelled));
        playSessions.flush();

        String owner = registerCustomer();
        String otherCustomer = registerCustomer();
        OffsetDateTime startsAt = OffsetDateTime.now(ZoneOffset.ofHours(7)).plusDays(14)
                .withHour(12).withMinute(0).withSecond(0).withNano(0);
        String reservationNumber = createReservation(owner, startsAt);

        mockMvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reservationNumber").value(reservationNumber))
                .andExpect(jsonPath("$[0].tableCode").exists());

        mockMvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + otherCustomer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/reservations/me")).andExpect(status().isUnauthorized());
    }

    private String createReservation(String token, OffsetDateTime startsAt) throws Exception {
        String body = "{\"branchId\":\"%s\",\"tableId\":\"%s\",\"contactName\":\"My Reservations\",\"contactPhone\":\"020000000\",\"contactEmail\":\"my-reservations@example.test\",\"startsAt\":\"%s\",\"endsAt\":\"%s\",\"playerCount\":2}"
                .formatted(CENTRAL, CENTRAL_A1, startsAt, startsAt.plusHours(1));
        MvcResult result = mockMvc.perform(post("/api/reservations").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn();
        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals("A1", created.path("tableCode").asText());
        return created.path("reservationNumber").asText();
    }

    private String registerCustomer() throws Exception {
        String email = "my-reservations-" + UUID.randomUUID() + "@example.test";
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"My\",\"lastName\":\"Reservations\",\"email\":\"%s\",\"password\":\"%s\",\"acceptTerms\":true,\"acceptPrivacy\":true}".formatted(email, PASSWORD)))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
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
}

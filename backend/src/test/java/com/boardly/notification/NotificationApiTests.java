package com.boardly.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID CENTRAL_A1 = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final String PASSWORD = "PhaseSixPassword!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private NotificationRepository notifications;
    @PersistenceContext private EntityManager entityManager;

    private record Customer(String token, UUID id) { }

    @Test
    void notificationEndpointsRequireLogin() throws Exception {
        mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications/unread-count")).andExpect(status().isUnauthorized());
    }

    @Test
    void customerSeesOnlyTheirOwnDueNotifications() throws Exception {
        Customer alice = register();
        Customer bob = register();
        OffsetDateTime now = OffsetDateTime.now();
        save(alice.id(), "Due", now.minusMinutes(5), Notification.NotificationStatus.pending);
        save(alice.id(), "Future", now.plusDays(1), Notification.NotificationStatus.pending);
        save(alice.id(), "Cancelled", now.minusMinutes(5), Notification.NotificationStatus.cancelled);
        save(bob.id(), "Bobs", now.minusMinutes(5), Notification.NotificationStatus.pending);

        mockMvc.perform(get("/api/notifications").header("Authorization", bearer(alice.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].subject").value("Due"))
                .andExpect(jsonPath("$[0].read").value(false));
        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer(alice.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void markReadAndMarkAllReadUpdateTheUnreadCount() throws Exception {
        Customer alice = register();
        OffsetDateTime now = OffsetDateTime.now();
        Notification first = save(alice.id(), "One", now.minusMinutes(5), Notification.NotificationStatus.pending);
        save(alice.id(), "Two", now.minusMinutes(4), Notification.NotificationStatus.pending);
        assertUnread(alice, 2);

        mockMvc.perform(patch("/api/notifications/{id}/read", first.getId()).header("Authorization", bearer(alice.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        assertUnread(alice, 1);

        mockMvc.perform(patch("/api/notifications/read-all").header("Authorization", bearer(alice.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
        assertUnread(alice, 0);
        assertNotNull(notifications.findById(first.getId()).orElseThrow().getReadAt());
    }

    @Test
    void customerCannotMarkSomeoneElsesNotificationAsRead() throws Exception {
        Customer alice = register();
        Customer bob = register();
        Notification bobs = save(bob.id(), "Bobs", OffsetDateTime.now().minusMinutes(5),
                Notification.NotificationStatus.pending);

        mockMvc.perform(patch("/api/notifications/{id}/read", bobs.getId()).header("Authorization", bearer(alice.token())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_FOUND"));
        assertNull(notifications.findById(bobs.getId()).orElseThrow().getReadAt());
    }

    @Test
    void reservingQueuesTwoRemindersAndCancellingHidesThem() throws Exception {
        Customer customer = register();
        OffsetDateTime startsAt = futureStart();

        MvcResult result = mockMvc.perform(post("/api/reservations").header("Authorization", bearer(customer.token()))
                        .contentType(MediaType.APPLICATION_JSON).content(reservationBody(startsAt, startsAt.plusHours(1))))
                .andExpect(status().isOk()).andReturn();
        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID reservationId = UUID.fromString(created.get("id").asText());

        List<Notification> reminders = remindersOf(reservationId);
        assertEquals(2, reminders.size());
        assertTrue(reminders.stream().allMatch(n -> n.getStatus() == Notification.NotificationStatus.pending
                && NotificationService.IN_APP.equals(n.getChannel())
                && customer.id().equals(n.getRecipientUserId())));
        assertEquals(startsAt.minusHours(24).toInstant(), reminders.get(0).getScheduledAt().toInstant());
        assertEquals(startsAt.minusHours(2).toInstant(), reminders.get(1).getScheduledAt().toInstant());

        mockMvc.perform(patch("/api/reservations/{number}/cancel", created.get("reservationNumber").asText())
                        .header("Authorization", bearer(customer.token())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Plans changed\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));

        entityManager.flush();
        entityManager.clear();
        assertTrue(remindersOf(reservationId).stream()
                .allMatch(n -> n.getStatus() == Notification.NotificationStatus.cancelled));
    }

    private void assertUnread(Customer customer, int expected) throws Exception {
        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer(customer.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(expected));
    }

    private List<Notification> remindersOf(UUID reservationId) {
        return notifications.findAll().stream()
                .filter(n -> reservationId.equals(n.getReservationId()))
                .sorted(Comparator.comparing(Notification::getScheduledAt))
                .toList();
    }

    private Notification save(UUID userId, String subject, OffsetDateTime scheduledAt,
            Notification.NotificationStatus status) {
        Notification notification = new Notification();
        notification.setType("reservation_reminder");
        notification.setChannel(NotificationService.IN_APP);
        notification.setRecipientUserId(userId);
        notification.setSubject(subject);
        notification.setBody(subject + " body");
        notification.setScheduledAt(scheduledAt);
        notification.setStatus(status);
        return notifications.saveAndFlush(notification);
    }

    private Customer register() throws Exception {
        String email = "notification-customer-" + UUID.randomUUID() + "@example.test";
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Notification\",\"lastName\":\"Test\",\"email\":\"%s\",\"password\":\"%s\",\"acceptTerms\":true,\"acceptPrivacy\":true}".formatted(email, PASSWORD)))
                .andExpect(status().isCreated()).andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new Customer(body.get("accessToken").asText(), UUID.fromString(body.get("user").get("id").asText()));
    }

    private String reservationBody(OffsetDateTime startsAt, OffsetDateTime endsAt) {
        return "{\"branchId\":\"%s\",\"tableId\":\"%s\",\"contactName\":\"Notification Test\",\"contactPhone\":\"020000000\",\"contactEmail\":\"notification@example.test\",\"startsAt\":\"%s\",\"endsAt\":\"%s\",\"playerCount\":2}".formatted(CENTRAL, CENTRAL_A1, startsAt, endsAt);
    }

    private OffsetDateTime futureStart() {
        return OffsetDateTime.now(ZoneOffset.ofHours(7)).plusDays(14).withHour(12).withMinute(0).withSecond(0).withNano(0);
    }

    private String bearer(String token) { return "Bearer " + token; }
}

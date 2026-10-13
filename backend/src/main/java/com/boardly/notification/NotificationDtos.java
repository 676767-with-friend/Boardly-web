package com.boardly.notification;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos() { }

    public record NotificationResponse(UUID id, String type, String subject, String body, UUID reservationId,
                                       OffsetDateTime scheduledAt, boolean read) { }

    public record UnreadCountResponse(long count) { }
}

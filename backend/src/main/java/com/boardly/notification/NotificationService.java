package com.boardly.notification;

import com.boardly.auth.AuthUser;
import com.boardly.common.exception.BoardlyException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    static final String IN_APP = "in_app";
    private static final int MAX_LIMIT = 50;

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationResponse> list(AuthUser user, int limit) {
        int size = Math.min(Math.max(limit, 1), MAX_LIMIT);
        return repository.findVisibleForUser(user.id(), IN_APP, Notification.NotificationStatus.cancelled,
                        OffsetDateTime.now(), PageRequest.of(0, size))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public NotificationDtos.UnreadCountResponse unreadCount(AuthUser user) {
        long count = repository.countUnreadForUser(user.id(), IN_APP, Notification.NotificationStatus.cancelled,
                OffsetDateTime.now());
        return new NotificationDtos.UnreadCountResponse(count);
    }

    @Transactional
    public NotificationDtos.NotificationResponse markRead(AuthUser user, UUID id) {
        Notification notification = repository.findById(id)
                .filter(n -> user.id().equals(n.getRecipientUserId()))
                .orElseThrow(() -> new BoardlyException("Notification not found.", 404, "NOTIFICATION_NOT_FOUND"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(OffsetDateTime.now());
        }
        return toResponse(notification);
    }

    @Transactional
    public NotificationDtos.UnreadCountResponse markAllRead(AuthUser user) {
        repository.markAllRead(user.id(), IN_APP, Notification.NotificationStatus.cancelled, OffsetDateTime.now());
        return new NotificationDtos.UnreadCountResponse(0);
    }

    private NotificationDtos.NotificationResponse toResponse(Notification n) {
        return new NotificationDtos.NotificationResponse(n.getId(), n.getType(), n.getSubject(), n.getBody(),
                n.getReservationId(), n.getScheduledAt(), n.getReadAt() != null);
    }
}

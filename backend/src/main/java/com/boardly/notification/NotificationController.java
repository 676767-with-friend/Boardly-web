package com.boardly.notification;

import com.boardly.auth.AuthUser;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificationDtos.NotificationResponse> list(@AuthenticationPrincipal AuthUser user,
                                                            @RequestParam(defaultValue = "20") int limit) {
        return service.list(user, limit);
    }

    @GetMapping("/unread-count")
    public NotificationDtos.UnreadCountResponse unreadCount(@AuthenticationPrincipal AuthUser user) {
        return service.unreadCount(user);
    }

    @PatchMapping("/{id}/read")
    public NotificationDtos.NotificationResponse markRead(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return service.markRead(user, id);
    }

    @PatchMapping("/read-all")
    public NotificationDtos.UnreadCountResponse markAllRead(@AuthenticationPrincipal AuthUser user) {
        return service.markAllRead(user);
    }
}

package com.boardly.notification;

import com.boardly.reservation.Reservation;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates and cancels the in-app reminders that belong to a reservation.
 * Called from ReservationService inside the same transaction as the booking.
 */
@Service
public class ReservationNotificationService {
    static final String TYPE_REMINDER = "reservation_reminder";
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale.ENGLISH);

    private final NotificationRepository repository;
    private final List<Integer> reminderHours;
    private final ZoneId zone;

    public ReservationNotificationService(NotificationRepository repository,
            @Value("${boardly.notification.reservation-reminder-hours:24,2}") String reminderHours,
            @Value("${boardly.notification.zone:Asia/Bangkok}") String zone) {
        this.repository = repository;
        this.reminderHours = Arrays.stream(reminderHours.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Integer::valueOf)
                .toList();
        this.zone = ZoneId.of(zone);
    }

    /** Queue one reminder per configured "hours before" value. Reminders already in the past are skipped. */
    @Transactional
    public void scheduleReminders(Reservation reservation) {
        if (reservation.getUser() == null) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        for (int hours : reminderHours) {
            OffsetDateTime showAt = reservation.getStartsAt().minusHours(hours);
            if (!showAt.isAfter(now)) {
                continue;
            }
            if (repository.existsByReservationIdAndTypeAndChannelAndScheduledAt(
                    reservation.getId(), TYPE_REMINDER, NotificationService.IN_APP, showAt)) {
                continue;
            }
            Notification notification = new Notification();
            notification.setType(TYPE_REMINDER);
            notification.setChannel(NotificationService.IN_APP);
            notification.setRecipientUserId(reservation.getUser().getId());
            notification.setReservationId(reservation.getId());
            notification.setSubject("Reservation reminder");
            notification.setBody(buildBody(reservation, hours));
            notification.setScheduledAt(showAt);
            repository.save(notification);
        }
    }

    /** Hide every reminder of this reservation that has not been cancelled yet. */
    @Transactional
    public void cancelReminders(Reservation reservation) {
        repository.cancelPendingForReservation(reservation.getId(),
                Notification.NotificationStatus.pending, Notification.NotificationStatus.cancelled);
    }

    private String buildBody(Reservation reservation, int hours) {
        String when = reservation.getStartsAt().atZoneSameInstant(zone).format(WHEN);
        String away = hours == 1 ? "1 hour" : hours + " hours";
        return "Your reservation " + reservation.getReservationNumber()
                + " at " + reservation.getBranch().getName()
                + " (table " + reservation.getTable().getCode() + ")"
                + " starts in " + away + ", on " + when + ".";
    }
}

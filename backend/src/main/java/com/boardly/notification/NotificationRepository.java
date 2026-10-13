package com.boardly.notification;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // Customer inbox: notifications that are due (scheduledAt <= now) and not cancelled, newest first.
    @Query("""
            select n from Notification n
            where n.recipientUserId = :userId
              and n.channel = :channel
              and n.status <> :excluded
              and n.scheduledAt <= :now
            order by n.scheduledAt desc
            """)
    List<Notification> findVisibleForUser(
            @Param("userId") UUID userId,
            @Param("channel") String channel,
            @Param("excluded") Notification.NotificationStatus excluded,
            @Param("now") OffsetDateTime now,
            Pageable pageable);

    // Number shown on the bell: visible notifications that are still unread.
    @Query("""
            select count(n) from Notification n
            where n.recipientUserId = :userId
              and n.channel = :channel
              and n.status <> :excluded
              and n.scheduledAt <= :now
              and n.readAt is null
            """)
    long countUnreadForUser(
            @Param("userId") UUID userId,
            @Param("channel") String channel,
            @Param("excluded") Notification.NotificationStatus excluded,
            @Param("now") OffsetDateTime now);

    // Mark every visible, unread notification of a user as read. Returns how many rows changed.
    @Modifying(clearAutomatically = true)
    @Query("""
            update Notification n set n.readAt = :now
            where n.recipientUserId = :userId
              and n.channel = :channel
              and n.status <> :excluded
              and n.scheduledAt <= :now
              and n.readAt is null
            """)
    int markAllRead(
            @Param("userId") UUID userId,
            @Param("channel") String channel,
            @Param("excluded") Notification.NotificationStatus excluded,
            @Param("now") OffsetDateTime now);

    // Hide the not-yet-cancelled notifications of one reservation (used when the reservation is cancelled).
    @Modifying(flushAutomatically = true)
    @Query("""
            update Notification n set n.status = :cancelled
            where n.reservationId = :reservationId
              and n.status = :pending
            """)
    int cancelPendingForReservation(
            @Param("reservationId") UUID reservationId,
            @Param("pending") Notification.NotificationStatus pending,
            @Param("cancelled") Notification.NotificationStatus cancelled);

    // Duplicate guard before queuing a reservation reminder.
    boolean existsByReservationIdAndTypeAndChannelAndScheduledAt(
            UUID reservationId, String type, String channel, OffsetDateTime scheduledAt);
}

package com.boardly.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    long countByUserId(UUID userId);
    long countByBranchIdAndStartsAtBetween(UUID branchId, OffsetDateTime from, OffsetDateTime to);
    List<Reservation> findByUserIdOrderByStartsAtDesc(UUID userId);
    List<Reservation> findByBranchIdAndStartsAtBetweenAndStatusInOrderByStartsAtAsc(
            UUID branchId, OffsetDateTime startsAt, OffsetDateTime endsAt, List<Reservation.ReservationStatus> statuses);
    Optional<Reservation> findByReservationNumber(String reservationNumber);
    Optional<Reservation> findByReservationNumberAndUserId(String reservationNumber, UUID userId);
    Optional<Reservation> findFirstByTableIdAndStatusInAndStartsAtLessThanEqualAndEndsAtGreaterThanOrderByStartsAtAsc(
            UUID tableId, List<Reservation.ReservationStatus> statuses, OffsetDateTime startsAt, OffsetDateTime endsAt);
    Optional<Reservation> findFirstByTableIdAndStatusInAndEndsAtGreaterThanAndStartsAtLessThanOrderByStartsAtAsc(
            UUID tableId, List<Reservation.ReservationStatus> statuses, OffsetDateTime now, OffsetDateTime dayEnd);
    boolean existsByTableId(UUID tableId);
    boolean existsByTableIdAndStatusInAndEndsAtGreaterThan(UUID tableId, List<Reservation.ReservationStatus> statuses, OffsetDateTime now);
    List<Reservation> findByTableIdAndStatusInAndEndsAtGreaterThan(UUID tableId,
            List<Reservation.ReservationStatus> statuses, OffsetDateTime now);

    @Query("select count(reservation) > 0 from Reservation reservation where reservation.table.id = :tableId and reservation.status not in ('cancelled', 'completed', 'no_show') and reservation.startsAt < :endsAt and reservation.endsAt > :startsAt")
    boolean conflicts(UUID tableId, OffsetDateTime startsAt, OffsetDateTime endsAt);

    @Query("select reservation from Reservation reservation where reservation.table.id = :tableId and reservation.status not in ('cancelled', 'completed', 'no_show') and reservation.startsAt < :endsAt and reservation.endsAt > :startsAt order by reservation.startsAt")
    List<Reservation> findConflicts(UUID tableId, OffsetDateTime startsAt, OffsetDateTime endsAt);

    @Query("select count(reservation) > 0 from Reservation reservation where reservation.table.id = :tableId and reservation.status in ('pending', 'confirmed') and reservation.startsAt <= :at and reservation.endsAt > :at")
    boolean hasCurrentReservation(UUID tableId, OffsetDateTime at);
}

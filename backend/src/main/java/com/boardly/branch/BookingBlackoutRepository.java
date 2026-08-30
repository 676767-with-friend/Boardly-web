package com.boardly.branch;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BookingBlackoutRepository extends JpaRepository<BookingBlackout, UUID> {
    @Query("select count(blackout) > 0 from BookingBlackout blackout where blackout.branch.id = :branchId and (blackout.tableId is null or blackout.tableId = :tableId) and blackout.startsAt < :endsAt and blackout.endsAt > :startsAt")
    boolean conflicts(UUID branchId, UUID tableId, OffsetDateTime startsAt, OffsetDateTime endsAt);
}

package com.boardly.branch;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.UUID;

public interface StoreTableRepository extends JpaRepository<StoreTable, UUID> {
    long countByBranchIdAndIsActiveTrue(UUID branchId);
    long countByBranchIdAndIsActiveTrueAndOperationalStatus(UUID branchId, StoreTable.OperationalStatus operationalStatus);
    List<StoreTable> findByBranchIdAndIsActiveTrueOrderBySortOrderAsc(UUID branchId);
    List<StoreTable> findByBranchIdOrderBySortOrderAsc(UUID branchId);
    java.util.Optional<StoreTable> findByIdAndBranchId(UUID id, UUID branchId);
    boolean existsByBranchIdAndCodeIgnoreCase(UUID branchId, String code);
    boolean existsByBranchIdAndCodeIgnoreCaseAndIdNot(UUID branchId, String code, UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select storeTable from StoreTable storeTable where storeTable.id = :id and storeTable.branch.id = :branchId")
    java.util.Optional<StoreTable> findForUpdate(UUID id, UUID branchId);
}

package com.boardly.order;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FulfillmentMethodRepository extends JpaRepository<FulfillmentMethod, UUID> {
    List<FulfillmentMethod> findByIsActiveTrueOrderByNameAsc();
}

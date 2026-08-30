package com.boardly.branch;

import java.util.UUID;

public record BranchResponse(
        UUID id,
        String code,
        String name,
        String address,
        String district,
        String province,
        String postalCode,
        String phone,
        String status,
        boolean allowReservations,
        String hours,
        long tableCount,
        long playableGameCount
) {
}

package com.boardly.branch;

import java.util.List;
import java.util.UUID;

public record BranchDetailResponse(
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
        long playableGameCount,
        List<BranchOperatingHourResponse> operatingHours,
        List<String> amenities,
        List<String> rules
) {
}

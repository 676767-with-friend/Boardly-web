package com.boardly.reservation;

import com.boardly.common.validation.PhoneNumbers;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class ReservationDtos {
    private ReservationDtos() { }

    public record AvailableTableResponse(UUID id, String code, String zone, short minPlayers, short maxPlayers) { }
    public record AvailabilityResponse(OffsetDateTime startsAt, OffsetDateTime endsAt, short players, BigDecimal estimatedFee, String currency, List<AvailableTableResponse> tables) { }
    public record CreateReservationRequest(@NotNull UUID branchId, @NotNull UUID tableId, @NotBlank String contactName,
                                           @Pattern(regexp = PhoneNumbers.OPTIONAL_PATTERN, message = PhoneNumbers.MESSAGE) String contactPhone, String contactEmail, @NotNull OffsetDateTime startsAt,
                                           @NotNull OffsetDateTime endsAt, @Positive short playerCount) { }
    public record CancelReservationRequest(String reason) { }
    public record ReservationResponse(UUID id, String reservationNumber, UUID branchId, String branchName, UUID tableId,
                                      String tableCode, String contactName, OffsetDateTime startsAt, OffsetDateTime endsAt,
                                      short playerCount, String status, BigDecimal estimatedFee, String currency) { }
    public record StaffReservationResponse(UUID id, String reservationNumber, UUID branchId, String branchName,
                                           UUID tableId, String tableCode, String contactName, String contactEmail,
                                           String contactPhone, OffsetDateTime startsAt, OffsetDateTime endsAt,
                                           short playerCount, String status, boolean checkInEligible,
                                           String checkInBlockReason) { }
    public record CheckInRequest() { }
    public record WalkInRequest(@NotNull UUID branchId, @NotNull UUID tableId, UUID userId, String guestName,
                                @Pattern(regexp = PhoneNumbers.OPTIONAL_PATTERN, message = PhoneNumbers.MESSAGE) String guestPhone, String guestEmail, @Positive short playerCount) { }
    public record CheckoutRequest(boolean paymentReceived) { }
    public record CheckoutResponse(UUID id, String status, String client, String tableCode, OffsetDateTime checkInAt,
                                   OffsetDateTime checkOutAt, OffsetDateTime serverTime, OffsetDateTime scheduledEndAt,
                                   Integer bookedDurationMinutes, long elapsedSeconds, long overtimeSeconds,
                                   BigDecimal baseFee, BigDecimal overtimeFee, BigDecimal finalFee, String currency) { }
    public record LiveTableResponse(UUID id, String code, String zone, short minPlayers, short maxPlayers, String status,
                                    boolean assignable, String assignmentBlockCode, String assignmentBlockReason,
                                    UUID sessionId, UUID reservationId, String reservationNumber, String client,
                                    Short players, OffsetDateTime reservationStartsAt, OffsetDateTime reservationEndsAt,
                                    String nextReservationNumber, OffsetDateTime nextReservationStartsAt,
                                    OffsetDateTime nextReservationEndsAt,
                                    OffsetDateTime checkInAt, OffsetDateTime serverTime, Integer bookedDurationMinutes,
                                    long elapsedSeconds, long overtimeSeconds, BigDecimal baseFee,
                                    BigDecimal overtimeFee, BigDecimal runningFee) { }
}

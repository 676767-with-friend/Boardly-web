package com.boardly.order;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class CheckoutDtos {
    private CheckoutDtos() {
    }

    public record CheckoutRequest(
            @NotBlank @Size(max = 100) String contactFirstName,
            @NotBlank @Size(max = 100) String contactLastName,
            @NotBlank @Email @Size(max = 255) String contactEmail,
            @Size(max = 30) String contactPhone,
            @NotNull UUID fulfillmentMethodId,
            UUID pickupBranchId,
            @NotNull UUID paymentMethodId,
            @Size(max = 255) String shippingAddress,
            @Size(max = 100) String shippingDistrict,
            @Size(max = 100) String shippingProvince,
            @Size(max = 20) String shippingPostalCode) {
    }

    public record FulfillmentOptionResponse(UUID id, String code, String name, BigDecimal baseFee,
                                            Short etaMinDays, Short etaMaxDays, boolean storePickup,
                                            boolean checkoutAvailable, String unavailableReason) {
    }

    public record PaymentMethodResponse(UUID id, String code, String name) {
    }

    public record PickupBranchResponse(UUID id, String name, String address, String district) {
    }

    public record CheckoutOptionsResponse(List<FulfillmentOptionResponse> fulfillmentMethods,
                                          List<PaymentMethodResponse> paymentMethods,
                                          List<PickupBranchResponse> eligiblePickupBranches) {
    }

    public record OrderItemResponse(UUID productId, String name, String sku, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {
    }

    public record OrderResponse(String orderNumber, String status, String fulfillmentMethod, String pickupBranchName,
                                BigDecimal subtotal, BigDecimal shippingFee, BigDecimal totalAmount, String currency,
                                LocalDate estimatedDeliveryDate, String paymentStatus, String paymentMethod,
                                List<OrderItemResponse> items) {
    }
}

package com.boardly.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.boardly.auth.AuthUser;
import com.boardly.branch.Branch;
import com.boardly.branch.BranchRepository;
import com.boardly.common.exception.BoardlyException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(CartCheckoutApiTests.PaymentTestConfiguration.class)
@Transactional
class CheckoutServiceBranchApiTests {
    private static final String WINGSPAN_ID = "20000000-0000-0000-0000-000000000001";
    private static final String CATAN_ID = "20000000-0000-0000-0000-000000000002";
    private static final String CENTRAL_BRANCH_ID = "50000000-0000-0000-0000-000000000001";
    private static final String SILOM_BRANCH_ID = "50000000-0000-0000-0000-000000000002";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired CheckoutService checkoutService;
    @Autowired FulfillmentMethodRepository fulfillmentMethodRepository;
    @Autowired PaymentMethodRepository paymentMethodRepository;
    @Autowired BranchRepository branchRepository;

    @Test
    void checkoutRejectsACartThatExistsButHasNoItems() throws Exception {
        String token = registerAndGetAccessToken();
        addItem(token, WINGSPAN_ID, 1);
        mockMvc.perform(delete("/api/cart").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());

        checkout(token, pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CART_EMPTY"));
    }

    @Test
    void inactivePaymentMethodBranchAndFulfillmentMethodAreEachRejected() throws Exception {
        String token = registerAndGetAccessToken();
        addItem(token, WINGSPAN_ID, 1);
        String pickupId = pickupMethodId();
        String paymentId = paymentMethodId();

        // Validation order in CheckoutService is fulfillment -> branch -> payment,
        // so each deactivation below is the first failing check at that moment.
        PaymentMethod payment = paymentMethodRepository.findById(UUID.fromString(paymentId)).orElseThrow();
        payment.setActive(false);
        paymentMethodRepository.saveAndFlush(payment);
        checkout(token, pickupId, CENTRAL_BRANCH_ID, paymentId)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PAYMENT_METHOD_INVALID"));

        Branch branch = branchRepository.findById(UUID.fromString(CENTRAL_BRANCH_ID)).orElseThrow();
        branch.setStatus(Branch.BranchStatus.inactive);
        branchRepository.saveAndFlush(branch);
        checkout(token, pickupId, CENTRAL_BRANCH_ID, paymentId)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PICKUP_BRANCH_INVALID"));

        FulfillmentMethod pickup = fulfillmentMethodRepository.findById(UUID.fromString(pickupId)).orElseThrow();
        pickup.setActive(false);
        fulfillmentMethodRepository.saveAndFlush(pickup);
        checkout(token, pickupId, CENTRAL_BRANCH_ID, paymentId)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("FULFILLMENT_METHOD_INVALID"));
    }

    @Test
    void checkoutFailsWhenTheBranchCannotStockEveryCartItem() throws Exception {
        String token = registerAndGetAccessToken();
        addItem(token, WINGSPAN_ID, 1);
        addItem(token, CATAN_ID, 2);

        checkout(token, pickupMethodId(), SILOM_BRANCH_ID, paymentMethodId())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PICKUP_STOCK_UNAVAILABLE"));
    }

    @Test
    void serviceRejectsAnAuthenticatedUserThatNoLongerExists() {
        AuthUser ghost = new AuthUser(UUID.randomUUID(), "ghost@boardly.test", List.of(), List.of(), List.of());
        CheckoutDtos.CheckoutRequest request = new CheckoutDtos.CheckoutRequest("Ghost", "User", "ghost@boardly.test", null,
                UUID.fromString(pickupMethodId()), UUID.fromString(CENTRAL_BRANCH_ID), UUID.fromString(paymentMethodId()),
                null, null, null, null);

        BoardlyException error = assertThrows(BoardlyException.class, () -> checkoutService.checkout(ghost, request));
        assertEquals(401, error.getStatus());
        assertEquals("AUTHENTICATION_REQUIRED", error.getCode());
    }

    private void addItem(String token, String productId, int quantity) throws Exception {
        mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"" + productId + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isCreated());
    }

    private ResultActions checkout(String token, String fulfillmentMethodId, String pickupBranchId, String paymentMethodId) throws Exception {
        String body = """
                {"contactFirstName":"Branch","contactLastName":"Cover","contactEmail":"branch-cover@example.test",
                 "fulfillmentMethodId":"%s","pickupBranchId":"%s","paymentMethodId":"%s"}
                """.formatted(fulfillmentMethodId, pickupBranchId, paymentMethodId);
        return mockMvc.perform(post("/api/checkout").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "checkout-branch-" + UUID.randomUUID() + "@boardly.test";
        String body = """
                {"firstName":"Branch","lastName":"Cover","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email);
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String pickupMethodId() {
        return fulfillmentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream().filter(FulfillmentMethod::isStorePickup)
                .findFirst().orElseThrow().getId().toString();
    }

    private String paymentMethodId() {
        return paymentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream().findFirst().orElseThrow().getId().toString();
    }
}

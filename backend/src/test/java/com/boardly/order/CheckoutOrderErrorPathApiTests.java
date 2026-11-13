package com.boardly.order;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.boardly.product.Product;
import com.boardly.product.ProductRepository;
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
class CheckoutOrderErrorPathApiTests {
    private static final String WINGSPAN_ID = "20000000-0000-0000-0000-000000000001";
    private static final String CENTRAL_BRANCH_ID = "50000000-0000-0000-0000-000000000001";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired FulfillmentMethodRepository fulfillmentMethodRepository;
    @Autowired PaymentMethodRepository paymentMethodRepository;
    @Autowired ProductRepository productRepository;

    @Test
    void orderAndCheckoutEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/orders/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/orders/BG-ANYTHING")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/checkout").contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutBody(pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void newUserHasNoOrdersAndUnknownOrderNumberIsNotFound() throws Exception {
        String token = registerAndGetAccessToken();

        mockMvc.perform(get("/api/orders/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/orders/{orderNumber}", "BG-DOESNOTEXIST").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void ordersAreListedForOwnerAndHiddenFromOtherUsers() throws Exception {
        String ownerToken = registerAndGetAccessToken();
        String otherToken = registerAndGetAccessToken();
        addWingspan(ownerToken, 1);

        MvcResult placed = checkout(ownerToken, pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId())
                .andExpect(status().isOk()).andReturn();
        String orderNumber = objectMapper.readTree(placed.getResponse().getContentAsString()).get("orderNumber").asText();

        mockMvc.perform(get("/api/orders/me").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].orderNumber").value(orderNumber));
        mockMvc.perform(get("/api/orders/me").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/orders/{orderNumber}", orderNumber).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void checkoutFailsWhenACartProductWasDeactivatedAfterBeingAdded() throws Exception {
        String token = registerAndGetAccessToken();
        addWingspan(token, 1);

        Product product = productRepository.findById(UUID.fromString(WINGSPAN_ID)).orElseThrow();
        product.setActive(false);
        productRepository.saveAndFlush(product);

        checkout(token, pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PRODUCT_UNAVAILABLE"));
    }

    @Test
    void checkoutOptionsRequireAnExistingCart() throws Exception {
        String token = registerAndGetAccessToken();

        mockMvc.perform(get("/api/checkout/options").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CART_EMPTY"));
    }

    private void addWingspan(String token, int quantity) throws Exception {
        mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"" + WINGSPAN_ID + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isCreated());
    }

    private ResultActions checkout(String token, String fulfillmentMethodId, String pickupBranchId, String paymentMethodId) throws Exception {
        return mockMvc.perform(post("/api/checkout").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkoutBody(fulfillmentMethodId, pickupBranchId, paymentMethodId)));
    }

    private String checkoutBody(String fulfillmentMethodId, String pickupBranchId, String paymentMethodId) {
        return """
                {"contactFirstName":"Error","contactLastName":"Path","contactEmail":"error-path@example.test",
                 "fulfillmentMethodId":"%s","pickupBranchId":"%s","paymentMethodId":"%s"}
                """.formatted(fulfillmentMethodId, pickupBranchId, paymentMethodId);
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "checkout-error-" + UUID.randomUUID() + "@boardly.test";
        String body = """
                {"firstName":"Error","lastName":"Path","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
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

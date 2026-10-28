package com.boardly.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Covers GET /api/orders/me and DELETE /api/cart, which had no test. Needs the dev seed data. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderAndCartSelfServiceApiTests {
    private static final String WINGSPAN_ID = "20000000-0000-0000-0000-000000000001";
    private static final String CATAN_ID = "20000000-0000-0000-0000-000000000002";
    private static final String CENTRAL_BRANCH_ID = "50000000-0000-0000-0000-000000000001";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired FulfillmentMethodRepository fulfillmentMethodRepository;
    @Autowired PaymentMethodRepository paymentMethodRepository;

    @Test
    void myOrdersListsOnlyTheCallersOrders() throws Exception {
        String buyer = registerAndGetAccessToken();
        String otherCustomer = registerAndGetAccessToken();

        addCartItem(buyer, 1);
        String first = placeOrder(buyer);
        addCartItem(buyer, 1);
        String second = placeOrder(buyer);

        List<String> numbers = orderNumbers(mockMvc.perform(get("/api/orders/me").header("Authorization", "Bearer " + buyer))
                .andExpect(status().isOk()));
        assertEquals(2, numbers.size());
        assertTrue(numbers.contains(first));
        assertTrue(numbers.contains(second));

        mockMvc.perform(get("/api/orders/me").header("Authorization", "Bearer " + otherCustomer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/orders/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void clearingTheCartRemovesEveryItem() throws Exception {
        String guestKey = UUID.randomUUID().toString();
        addGuestItem(guestKey, WINGSPAN_ID);
        addGuestItem(guestKey, CATAN_ID);
        mockMvc.perform(get("/api/cart").header("X-Guest-Session-Key", guestKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(2));

        mockMvc.perform(delete("/api/cart").header("X-Guest-Session-Key", guestKey))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/cart").header("X-Guest-Session-Key", guestKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(0))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    private void addGuestItem(String guestKey, String productId) throws Exception {
        mockMvc.perform(post("/api/cart/items").header("X-Guest-Session-Key", guestKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"" + productId + "\",\"quantity\":1}"))
                .andExpect(status().isCreated());
    }

    private void addCartItem(String accessToken, int quantity) throws Exception {
        mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"" + WINGSPAN_ID + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isCreated());
    }

    private String placeOrder(String accessToken) throws Exception {
        String body = """
                {"contactFirstName":"Self","contactLastName":"Service","contactEmail":"self-service@example.test",
                 "fulfillmentMethodId":"%s","pickupBranchId":"%s","paymentMethodId":"%s"}
                """.formatted(pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId());
        MvcResult result = mockMvc.perform(post("/api/checkout").header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("orderNumber").asText();
    }

    private List<String> orderNumbers(ResultActions actions) throws Exception {
        JsonNode array = objectMapper.readTree(actions.andReturn().getResponse().getContentAsString());
        List<String> numbers = new ArrayList<>();
        array.forEach(node -> numbers.add(node.path("orderNumber").asText()));
        return numbers;
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "self-service-" + UUID.randomUUID() + "@boardly.test";
        String body = """
                {"firstName":"Self","lastName":"Service","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
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

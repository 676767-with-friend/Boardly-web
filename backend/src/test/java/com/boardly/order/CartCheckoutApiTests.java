package com.boardly.order;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.boardly.inventory.BranchProductInventoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CartCheckoutApiTests {
    private static final String WINGSPAN_ID = "20000000-0000-0000-0000-000000000001";
    private static final String CATAN_ID = "20000000-0000-0000-0000-000000000002";
    private static final String CENTRAL_BRANCH_ID = "50000000-0000-0000-0000-000000000001";
    private static final String SILOM_BRANCH_ID = "50000000-0000-0000-0000-000000000002";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired FulfillmentMethodRepository fulfillmentMethodRepository;
    @Autowired PaymentMethodRepository paymentMethodRepository;
    @Autowired BranchProductInventoryRepository inventoryRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void guestCartRequiresPossessionOfItsSessionKeyAndSupportsMutations() throws Exception {
        mockMvc.perform(get("/api/cart")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CART_SESSION_REQUIRED"));

        String guestKey = UUID.randomUUID().toString();
        MvcResult added = mockMvc.perform(post("/api/cart/items").header("X-Guest-Session-Key", guestKey)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productId\":\"" + WINGSPAN_ID + "\",\"quantity\":2}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.itemCount").value(2)).andReturn();
        String itemId = objectMapper.readTree(added.getResponse().getContentAsString()).at("/items/0/id").asText();

        mockMvc.perform(patch("/api/cart/items/{itemId}", itemId).header("X-Guest-Session-Key", guestKey)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":3}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].quantity").value(3))
                .andExpect(jsonPath("$.items[0].unitPrice").value(1890));
        mockMvc.perform(delete("/api/cart/items/{itemId}", itemId).header("X-Guest-Session-Key", guestKey))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/cart").header("X-Guest-Session-Key", guestKey))
                .andExpect(status().isOk()).andExpect(jsonPath("$.itemCount").value(0));
    }

    @Test
    void invalidCartQuantityIsRejected() throws Exception {
        String guestKey = UUID.randomUUID().toString();
        mockMvc.perform(post("/api/cart/items").header("X-Guest-Session-Key", guestKey)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productId\":\"" + WINGSPAN_ID + "\",\"quantity\":0}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void pickupCheckoutPersistsFinancialSnapshotsPaymentAndInventoryReservation() throws Exception {
        String accessToken = registerAndGetAccessToken();
        addAuthenticatedCartItem(accessToken, 1);
        int reservedBefore = reservedQuantity();

        MvcResult checkoutResult = checkout(accessToken, pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("new"))
                .andExpect(jsonPath("$.subtotal").value(1890))
                .andExpect(jsonPath("$.shippingFee").value(0))
                .andExpect(jsonPath("$.totalAmount").value(1890))
                .andExpect(jsonPath("$.items[0].name").value("Wingspan"))
                .andExpect(jsonPath("$.items[0].sku").value("SG-WING-EN"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(1890))
                .andExpect(jsonPath("$.paymentStatus").value("pending"))
                .andExpect(jsonPath("$.paymentMethod").exists())
                .andReturn();
        JsonNode response = objectMapper.readTree(checkoutResult.getResponse().getContentAsString());

        String orderNumber = response.get("orderNumber").asText();
        org.junit.jupiter.api.Assertions.assertEquals(reservedBefore + 1, reservedQuantity());
        Integer movementCount = jdbcTemplate.queryForObject("select count(*) from inventory_movements where reference_type = 'order' and movement_type = 'reserve'", Integer.class);
        org.junit.jupiter.api.Assertions.assertNotNull(movementCount);
        org.junit.jupiter.api.Assertions.assertTrue(movementCount > 0);
        String providerReference = jdbcTemplate.queryForObject("select p.provider_reference from payments p join orders o on o.id = p.order_id where o.order_number = ?", String.class, orderNumber);
        org.junit.jupiter.api.Assertions.assertTrue(providerReference.startsWith("dev-pending-"));

        mockMvc.perform(get("/api/orders/{orderNumber}", orderNumber).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.orderNumber").value(orderNumber));
        mockMvc.perform(get("/api/cart").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.itemCount").value(0));
    }

    @Test
    void checkoutRejectsOutOfStockAndUnresolvedDeliveryInventory() throws Exception {
        String accessToken = registerAndGetAccessToken();
        addAuthenticatedCartItem(accessToken, 13);

        checkout(accessToken, pickupMethodId(), CENTRAL_BRANCH_ID, paymentMethodId())
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PICKUP_STOCK_UNAVAILABLE"));
        checkout(accessToken, deliveryMethodId(), null, paymentMethodId())
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("DELIVERY_INVENTORY_UNRESOLVED"));
    }

    @Test
    void checkoutOptionsOnlyExposePickupBranchesThatCanFulfillEveryCartItem() throws Exception {
        String accessToken = registerAndGetAccessToken();
        addAuthenticatedCartItem(accessToken, 1);
        mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productId\":\"" + CATAN_ID + "\",\"quantity\":2}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/checkout/options").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligiblePickupBranches[?(@.id == '" + CENTRAL_BRANCH_ID + "')]").exists())
                .andExpect(jsonPath("$.eligiblePickupBranches[?(@.id == '" + SILOM_BRANCH_ID + "')]").doesNotExist());
        mockMvc.perform(get("/api/checkout/options"))
                .andExpect(status().isUnauthorized());
    }

    private void addAuthenticatedCartItem(String accessToken, int quantity) throws Exception {
        mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productId\":\"" + WINGSPAN_ID + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isCreated());
    }

    private ResultActions checkout(String token, String fulfillmentMethodId, String pickupBranchId, String paymentMethodId) throws Exception {
        String pickup = pickupBranchId == null ? "null" : "\"" + pickupBranchId + "\"";
        String body = """
                {"contactFirstName":"Phase","contactLastName":"Five","contactEmail":"phase-five@example.test",
                 "fulfillmentMethodId":"%s","pickupBranchId":%s,"paymentMethodId":"%s"}
                """.formatted(fulfillmentMethodId, pickup, paymentMethodId);
        return mockMvc.perform(post("/api/checkout").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "phase-five-" + UUID.randomUUID() + "@boardly.test";
        String body = """
                {"firstName":"Phase","lastName":"Five","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email);
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String pickupMethodId() {
        return fulfillmentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream().filter(FulfillmentMethod::isStorePickup)
                .findFirst().orElseThrow().getId().toString();
    }

    private String deliveryMethodId() {
        return fulfillmentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream().filter(method -> !method.isStorePickup())
                .findFirst().orElseThrow().getId().toString();
    }

    private String paymentMethodId() {
        return paymentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream().findFirst().orElseThrow().getId().toString();
    }

    private int reservedQuantity() {
        return inventoryRepository.findById(new com.boardly.inventory.BranchProductInventoryId(UUID.fromString(CENTRAL_BRANCH_ID), UUID.fromString(WINGSPAN_ID)))
                .orElseThrow().getReservedQuantity();
    }
}

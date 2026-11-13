package com.boardly.cart;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.UUID;

import com.boardly.product.Product;
import com.boardly.product.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CartServiceEdgeCaseApiTests {
    private static final String GUEST_HEADER = "X-Guest-Session-Key";
    private static final String WINGSPAN_ID = "20000000-0000-0000-0000-000000000001";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ProductRepository productRepository;

    @Test
    void guestSessionKeyMustBeAPresentUuidOfReasonableLength() throws Exception {
        mockMvc.perform(get("/api/cart").header(GUEST_HEADER, "not-a-uuid"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CART_SESSION_REQUIRED"));
        mockMvc.perform(get("/api/cart").header(GUEST_HEADER, "a".repeat(256)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CART_SESSION_REQUIRED"));
        mockMvc.perform(get("/api/cart").header(GUEST_HEADER, " "))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CART_SESSION_REQUIRED"));
    }

    @Test
    void guestWithoutACartGetsAnEmptyCart() throws Exception {
        mockMvc.perform(get("/api/cart").header(GUEST_HEADER, UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(0))
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.currency").value("THB"));
    }

    @Test
    void addingUnknownOrInactiveProductsIsRejected() throws Exception {
        String guestKey = UUID.randomUUID().toString();

        addGuestItem(guestKey, UUID.randomUUID().toString(), 1)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));

        deactivateWingspan();
        addGuestItem(guestKey, WINGSPAN_ID, 1)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
    }

    @Test
    void addingTheSameProductTwiceMergesQuantities() throws Exception {
        String guestKey = UUID.randomUUID().toString();

        addGuestItem(guestKey, WINGSPAN_ID, 2).andExpect(status().isCreated());
        addGuestItem(guestKey, WINGSPAN_ID, 3).andExpect(status().isCreated())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].quantity").value(5))
                .andExpect(jsonPath("$.itemCount").value(5));
    }

    @Test
    void mergedQuantityAboveTheLimitIsRejected() throws Exception {
        String guestKey = UUID.randomUUID().toString();

        addGuestItem(guestKey, WINGSPAN_ID, 99).andExpect(status().isCreated());
        addGuestItem(guestKey, WINGSPAN_ID, 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUANTITY"));
    }

    @Test
    void cartUsesTheSalePriceWhenOneIsSet() throws Exception {
        Product product = productRepository.findById(UUID.fromString(WINGSPAN_ID)).orElseThrow();
        product.setSalePrice(new BigDecimal("1500.00"));
        productRepository.saveAndFlush(product);

        addGuestItem(UUID.randomUUID().toString(), WINGSPAN_ID, 2).andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].unitPrice").value(1500))
                .andExpect(jsonPath("$.subtotal").value(3000));
    }

    @Test
    void updatingOrRemovingMissingItemsFailsClearly() throws Exception {
        String guestKey = UUID.randomUUID().toString();
        String unknownItem = UUID.randomUUID().toString();

        // No cart exists yet for this guest.
        mockMvc.perform(patch("/api/cart/items/{id}", unknownItem).header(GUEST_HEADER, guestKey)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":2}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CART_EMPTY"));
        mockMvc.perform(delete("/api/cart/items/{id}", unknownItem).header(GUEST_HEADER, guestKey))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CART_EMPTY"));

        // Cart exists, but the item id is not in it.
        addGuestItem(guestKey, WINGSPAN_ID, 1).andExpect(status().isCreated());
        mockMvc.perform(patch("/api/cart/items/{id}", unknownItem).header(GUEST_HEADER, guestKey)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":2}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("CART_ITEM_NOT_FOUND"));
        mockMvc.perform(delete("/api/cart/items/{id}", unknownItem).header(GUEST_HEADER, guestKey))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("CART_ITEM_NOT_FOUND"));
    }

    @Test
    void guestCannotTouchAnotherGuestsCartItem() throws Exception {
        String ownerKey = UUID.randomUUID().toString();
        String intruderKey = UUID.randomUUID().toString();
        String itemId = firstItemId(addGuestItem(ownerKey, WINGSPAN_ID, 1).andExpect(status().isCreated()).andReturn());
        addGuestItem(intruderKey, WINGSPAN_ID, 1).andExpect(status().isCreated());

        mockMvc.perform(patch("/api/cart/items/{id}", itemId).header(GUEST_HEADER, intruderKey)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":9}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("CART_ITEM_NOT_FOUND"));
        mockMvc.perform(delete("/api/cart/items/{id}", itemId).header(GUEST_HEADER, intruderKey))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("CART_ITEM_NOT_FOUND"));
        mockMvc.perform(get("/api/cart").header(GUEST_HEADER, ownerKey))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].quantity").value(1));
    }

    @Test
    void clearEmptiesTheCartAndIsSafeWithoutOne() throws Exception {
        String guestKey = UUID.randomUUID().toString();

        mockMvc.perform(delete("/api/cart").header(GUEST_HEADER, guestKey)).andExpect(status().isNoContent());

        addGuestItem(guestKey, WINGSPAN_ID, 2).andExpect(status().isCreated());
        mockMvc.perform(delete("/api/cart").header(GUEST_HEADER, guestKey)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/cart").header(GUEST_HEADER, guestKey))
                .andExpect(status().isOk()).andExpect(jsonPath("$.itemCount").value(0));
    }

    @Test
    void authenticatedUserReusesOneCartAcrossAdds() throws Exception {
        String token = registerAndGetAccessToken();

        mockMvc.perform(get("/api/cart").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.itemCount").value(0));

        MvcResult first = addAuthenticatedItem(token, 1).andExpect(status().isCreated()).andReturn();
        MvcResult second = addAuthenticatedItem(token, 2).andExpect(status().isCreated())
                .andExpect(jsonPath("$.itemCount").value(3)).andReturn();

        String firstCartId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asText();
        String secondCartId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asText();
        Assertions.assertEquals(firstCartId, secondCartId);

        mockMvc.perform(delete("/api/cart").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/cart").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.itemCount").value(0));
    }

    private ResultActions addGuestItem(String guestKey, String productId, int quantity) throws Exception {
        return mockMvc.perform(post("/api/cart/items").header(GUEST_HEADER, guestKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":\"" + productId + "\",\"quantity\":" + quantity + "}"));
    }

    private ResultActions addAuthenticatedItem(String token, int quantity) throws Exception {
        return mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":\"" + WINGSPAN_ID + "\",\"quantity\":" + quantity + "}"));
    }

    private String firstItemId(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).at("/items/0/id").asText();
    }

    private void deactivateWingspan() {
        Product product = productRepository.findById(UUID.fromString(WINGSPAN_ID)).orElseThrow();
        product.setActive(false);
        productRepository.saveAndFlush(product);
    }

    private String registerAndGetAccessToken() throws Exception {
        String email = "cart-edge-" + UUID.randomUUID() + "@boardly.test";
        String body = """
                {"firstName":"Cart","lastName":"Edge","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email);
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
}

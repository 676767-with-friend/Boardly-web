package com.boardly.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class CheckoutConcurrencyApiTests {
    private static final UUID WINGSPAN = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired FulfillmentMethodRepository fulfillmentMethods;
    @Autowired PaymentMethodRepository paymentMethods;
    @Autowired JdbcTemplate jdbcTemplate;

    private final List<UUID> createdUsers = new ArrayList<>();
    private int reservedBefore;

    @BeforeEach
    void rememberInventory() {
        reservedBefore = reservedQuantity();
    }

    @AfterEach
    void removeTestData() {
        for (UUID userId : createdUsers) {
            jdbcTemplate.update("delete from inventory_movements where reference_type = 'order' and reference_id in (select id from orders where user_id = ?)", userId);
            jdbcTemplate.update("delete from payments where order_id in (select id from orders where user_id = ?)", userId);
            jdbcTemplate.update("delete from order_items where order_id in (select id from orders where user_id = ?)", userId);
            jdbcTemplate.update("delete from orders where user_id = ?", userId);
            jdbcTemplate.update("delete from cart_items where cart_id in (select id from carts where user_id = ?)", userId);
            jdbcTemplate.update("delete from carts where user_id = ?", userId);
            jdbcTemplate.update("delete from password_reset_tokens where user_id = ?", userId);
            jdbcTemplate.update("delete from auth_sessions where user_id = ?", userId);
            jdbcTemplate.update("delete from user_consents where user_id = ?", userId);
            jdbcTemplate.update("delete from user_roles where user_id = ?", userId);
            jdbcTemplate.update("delete from staff_branch_assignments where user_id = ?", userId);
            jdbcTemplate.update("delete from users where id = ?", userId);
        }
        jdbcTemplate.update("update branch_product_inventory set reserved_quantity = ? where branch_id = ? and product_id = ?",
                reservedBefore, CENTRAL, WINGSPAN);
    }

    @Test
    void concurrentCheckoutOfTheSameCartCreatesOneOrderAndRetryIsRejected() throws Exception {
        Account account = registerWithCart(1);

        List<MvcResult> results = checkoutConcurrently(account.token(), account.token());

        assertEquals(List.of(200, 422), results.stream().map(result -> result.getResponse().getStatus()).sorted().toList());
        MvcResult rejected = results.stream().filter(result -> result.getResponse().getStatus() == 422).findFirst().orElseThrow();
        assertEquals("CART_EMPTY", objectMapper.readTree(rejected.getResponse().getContentAsString()).path("code").asText());
        assertEffects(account.id(), 1);
        assertEquals(reservedBefore + 1, reservedQuantity());

        checkout(account.token(), checkoutBody()).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CART_EMPTY"));
        assertEffects(account.id(), 1);
        assertEquals(reservedBefore + 1, reservedQuantity());
    }

    @Test
    void concurrentCheckoutOfDifferentCartsCreatesBothOrders() throws Exception {
        Account first = registerWithCart(1);
        Account second = registerWithCart(1);

        List<MvcResult> results = checkoutConcurrently(first.token(), second.token());

        assertTrue(results.stream().allMatch(result -> result.getResponse().getStatus() == 200));
        assertEffects(first.id(), 1);
        assertEffects(second.id(), 1);
        assertEquals(reservedBefore + 2, reservedQuantity());
    }

    @Test
    void insufficientInventoryRollsBackOrderInventoryAndPayment() throws Exception {
        Account account = registerWithCart(13);

        checkout(account.token(), checkoutBody()).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PICKUP_STOCK_UNAVAILABLE"));

        assertEffects(account.id(), 0);
        assertEquals(reservedBefore, reservedQuantity());
    }

    private List<MvcResult> checkoutConcurrently(String... tokens) throws Exception {
        String body = checkoutBody();
        CountDownLatch ready = new CountDownLatch(tokens.length);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(tokens.length);
        try {
            List<Future<MvcResult>> futures = new ArrayList<>();
            for (String token : tokens) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent checkout did not start");
                    return checkout(token, body).andReturn();
                }));
            }
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            List<MvcResult> results = new ArrayList<>();
            for (Future<MvcResult> future : futures) results.add(future.get(60, TimeUnit.SECONDS));
            return results;
        } finally {
            start.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    private Account registerWithCart(int quantity) throws Exception {
        String email = "checkout-concurrency-" + UUID.randomUUID() + "@boardly.test";
        String registerBody = """
                {"firstName":"Concurrent","lastName":"Checkout","email":"%s","password":"BoardlyPass123!","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email);
        JsonNode registration = objectMapper.readTree(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        Account account = new Account(UUID.fromString(registration.at("/user/id").asText()), registration.path("accessToken").asText());
        createdUsers.add(account.id());
        mockMvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + account.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"" + WINGSPAN + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isCreated());
        return account;
    }

    private org.springframework.test.web.servlet.ResultActions checkout(String token, String body) throws Exception {
        return mockMvc.perform(post("/api/checkout").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String checkoutBody() {
        UUID fulfillmentMethodId = fulfillmentMethods.findByIsActiveTrueOrderByNameAsc().stream()
                .filter(FulfillmentMethod::isStorePickup).findFirst().orElseThrow().getId();
        UUID paymentMethodId = paymentMethods.findByIsActiveTrueOrderByNameAsc().stream().findFirst().orElseThrow().getId();
        return """
                {"contactFirstName":"Concurrent","contactLastName":"Checkout","contactEmail":"concurrent@example.test",
                 "fulfillmentMethodId":"%s","pickupBranchId":"%s","paymentMethodId":"%s"}
                """.formatted(fulfillmentMethodId, CENTRAL, paymentMethodId);
    }

    private void assertEffects(UUID userId, int expected) {
        assertEquals(expected, count("select count(*) from orders where user_id = ?", userId));
        assertEquals(expected, count("select count(*) from payments where order_id in (select id from orders where user_id = ?)", userId));
        assertEquals(expected, count("select count(*) from inventory_movements where reference_type = 'order' and reference_id in (select id from orders where user_id = ?)", userId));
    }

    private int count(String sql, UUID userId) {
        return jdbcTemplate.queryForObject(sql, Integer.class, userId);
    }

    private int reservedQuantity() {
        return jdbcTemplate.queryForObject(
                "select reserved_quantity from branch_product_inventory where branch_id = ? and product_id = ?",
                Integer.class, CENTRAL, WINGSPAN);
    }

    private record Account(UUID id, String token) {}
}

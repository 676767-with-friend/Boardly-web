package com.boardly.product;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.empty;
import static org.junit.jupiter.api.Assumptions.assumeFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fills the gaps ProductReadApiTests leaves in ProductReadService:
 * search filter, every sort key, invalid difficulty, paging clamps,
 * 404 paths, null-able detail fields and the review author fallback.
 * Every test is @Transactional so data is rolled back after each case.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductReadServiceCoverageApiTests {

    private static final String WINGSPAN = "20000000-0000-0000-0000-000000000001";
    private static final String CODENAMES = "20000000-0000-0000-0000-000000000004";
    private static final String DIXIT = "20000000-0000-0000-0000-000000000008";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void searchIsCaseInsensitiveAndBlankSearchIsIgnored() throws Exception {
        mockMvc.perform(get("/api/products").param("search", "WINGS").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Wingspan"));

        mockMvc.perform(get("/api/products").param("search", "   ").param("category", " ").param("difficulty", "")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())));
    }

    @Test
    void categoryFilterIsCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "pArTy").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].name", containsInAnyOrder("Codenames", "Dixit")));
    }

    @Test
    void unknownDifficultyMatchesNothing() throws Exception {
        mockMvc.perform(get("/api/products").param("difficulty", "nope").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void validDifficultyFiltersByEnum() throws Exception {
        mockMvc.perform(get("/api/products").param("difficulty", "EXPERT").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Gloomhaven"))
                .andExpect(jsonPath("$.content[0].difficulty").value("Expert"));
    }

    @Test
    void sortsByPriceAscendingAndDescendingWithBothAliases() throws Exception {
        for (String key : List.of("priceAsc", "price_asc")) {
            mockMvc.perform(get("/api/products").param("sort", key).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].name").value("Codenames"));
        }
        for (String key : List.of("priceDesc", "price_desc")) {
            mockMvc.perform(get("/api/products").param("sort", key).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].name").value("Gloomhaven"));
        }
    }

    @Test
    void sortsByNewestAndFallsBackToNameForDefaultAndUnknownKeys() throws Exception {
        // "newest" depends on the real clock (published within 30 days), so only assert it works
        mockMvc.perform(get("/api/products").param("sort", "newest").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())));

        mockMvc.perform(get("/api/products").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Azul"));

        mockMvc.perform(get("/api/products").param("sort", "something-else").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Azul"));
    }

    @Test
    void ratingSortPutsBestRatedFirst() throws Exception {
        mockMvc.perform(get("/api/products").param("sort", "RATING").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].rating").value(5.0));
    }

    @Test
    void pagingIsClampedToSafeBounds() throws Exception {
        mockMvc.perform(get("/api/products").param("size", "0").param("page", "-3").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.number").value(0));

        mockMvc.perform(get("/api/products").param("size", "500").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100));

        mockMvc.perform(get("/api/products").param("page", "99").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void maxPriceFiltersOnBasePrice() throws Exception {
        mockMvc.perform(get("/api/products").param("maxPrice", "700").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Codenames"));
    }

    @Test
    void detailShowsSalePriceEqualMinMaxRangeAndAnonymousReviewAuthor() throws Exception {
        mockMvc.perform(get("/api/products/" + DIXIT).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salePrice").value(790))
                .andExpect(jsonPath("$.players").value("3-6"))
                .andExpect(jsonPath("$.playTime").value("30 min"))
                .andExpect(jsonPath("$.age").value("8+"))
                .andExpect(jsonPath("$.difficulty").value("Easy"))
                .andExpect(jsonPath("$.reviews", hasSize(1)))
                .andExpect(jsonPath("$.reviews[0].author").value("Boardly customer"));
    }

    @Test
    void detailReturnsNullAgeAndPlayTimeWhenNotSet() throws Exception {
        jdbc.update("UPDATE products SET min_age = NULL, min_play_time_minutes = NULL, "
                + "max_play_time_minutes = NULL WHERE id = ?::uuid", CODENAMES);

        mockMvc.perform(get("/api/products/" + CODENAMES).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.age").doesNotExist())
                .andExpect(jsonPath("$.playTime").doesNotExist())
                .andExpect(jsonPath("$.players").value("2-8"));
    }

    @Test
    void detailUsesReviewerDisplayNameWhenReviewHasAUser() throws Exception {
        List<UUID> users = jdbc.queryForList("SELECT id FROM users LIMIT 1", UUID.class);
        assumeFalse(users.isEmpty(), "dev seed has no users");
        UUID userId = users.get(0);
        String displayName = jdbc.queryForObject("SELECT display_name FROM users WHERE id = ?", String.class, userId);
        jdbc.update("INSERT INTO product_reviews (product_id, user_id, rating, review_text, status) "
                + "VALUES (?::uuid, ?, 3, 'ok', 'published')", WINGSPAN, userId);

        mockMvc.perform(get("/api/products/" + WINGSPAN).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews", hasSize(3)))
                .andExpect(jsonPath("$.reviewCount").value(3))
                .andExpect(jsonPath("$.reviews[?(@.rating == 3)].author")
                        .value(displayName));
    }

    @Test
    void unknownProductReturns404() throws Exception {
        mockMvc.perform(get("/api/products/" + UUID.randomUUID()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void inactiveProductReturns404AndIsHiddenFromTheList() throws Exception {
        Product wingspan = productRepository.findById(UUID.fromString(WINGSPAN)).orElseThrow();
        wingspan.setActive(false);
        productRepository.saveAndFlush(wingspan);

        mockMvc.perform(get("/api/products/" + WINGSPAN).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/products").param("search", "wingspan").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }
}

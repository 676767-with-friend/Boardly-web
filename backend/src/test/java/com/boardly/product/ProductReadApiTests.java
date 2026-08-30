package com.boardly.product;

import com.boardly.inventory.BranchProductInventoryRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@SpringBootTest
@AutoConfigureMockMvc
class ProductReadApiTests {

    private static final UUID WINGSPAN_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BranchProductInventoryRepository inventoryRepository;

    @Test
    void listsActiveProductCategories() throws Exception {
        mockMvc.perform(get("/api/product-categories").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Strategy"));
    }

    @Test
    void allowsProductPreflightFromTheFrontendDevServer() throws Exception {
        mockMvc.perform(options("/api/products")
                        .header("Origin", "http://localhost:8443")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8443"));
    }

    @Test
    void returnsFilteredProductSummariesWithDerivedFields() throws Exception {
        long availableStock = inventoryRepository.availableStockByProductId(WINGSPAN_ID);

        mockMvc.perform(get("/api/products")
                        .param("category", "Strategy")
                        .param("difficulty", "medium")
                        .param("maxPrice", "2000")
                        .param("sort", "rating")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Wingspan"))
                .andExpect(jsonPath("$.content[0].category").value("Strategy"))
                .andExpect(jsonPath("$.content[0].rating").value(4.5))
                .andExpect(jsonPath("$.content[0].reviewCount").value(2))
                .andExpect(jsonPath("$.content[0].stock").value(availableStock))
                .andExpect(jsonPath("$.content[0].image").value("/product-media/Wingspan.jpg"));
    }

    @Test
    void returnsProductDetailByUuidWithMediaAndPublishedReviews() throws Exception {
        mockMvc.perform(get("/api/products/20000000-0000-0000-0000-000000000001")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("SG-WING-EN"))
                .andExpect(jsonPath("$.media[0].url").value("/product-media/Wingspan.jpg"))
                .andExpect(jsonPath("$.reviews.length()").value(2));
    }
}

package com.boardly.product;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ProductController {

    private final ProductReadService productReadService;

    public ProductController(ProductReadService productReadService) {
        this.productReadService = productReadService;
    }

    @GetMapping("/product-categories")
    public List<ProductCategoryResponse> categories() {
        return productReadService.categories();
    }

    @GetMapping("/products")
    public Page<ProductResponse> products(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return productReadService.products(search, category, difficulty, maxPrice, sort, page, size);
    }

    @GetMapping("/products/{id}")
    public ProductResponse product(@PathVariable UUID id) {
        return productReadService.product(id);
    }
}

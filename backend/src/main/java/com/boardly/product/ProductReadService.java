package com.boardly.product;

import com.boardly.common.exception.BoardlyException;
import com.boardly.inventory.BranchProductInventoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@Transactional(readOnly = true)
public class ProductReadService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductMediaRepository mediaRepository;
    private final ProductReviewRepository reviewRepository;
    private final BranchProductInventoryRepository inventoryRepository;

    public ProductReadService(ProductRepository productRepository, ProductCategoryRepository categoryRepository,
                              ProductMediaRepository mediaRepository, ProductReviewRepository reviewRepository,
                              BranchProductInventoryRepository inventoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.mediaRepository = mediaRepository;
        this.reviewRepository = reviewRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public List<ProductCategoryResponse> categories() {
        return categoryRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(category -> new ProductCategoryResponse(category.getId(), category.getCode(), category.getName()))
                .toList();
    }

    public Page<ProductResponse> products(String search, String category, String difficulty, BigDecimal maxPrice,
                                          String sort, int page, int size) {
        Specification<Product> specification = activeProducts();
        if (hasText(search)) specification = specification.and(nameContains(search));
        if (hasText(category)) specification = specification.and(categoryMatches(category));
        if (hasText(difficulty)) specification = specification.and(difficultyMatches(difficulty));
        if (maxPrice != null) specification = specification.and((root, query, builder) -> builder.lessThanOrEqualTo(root.get("basePrice"), maxPrice));

        List<ProductResponse> responses = productRepository.findAll(specification).stream()
                .map(product -> toResponse(product, false))
                .sorted(sortComparator(sort))
                .toList();

        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        int from = Math.min(safePage * safeSize, responses.size());
        int to = Math.min(from + safeSize, responses.size());
        return new PageImpl<>(responses.subList(from, to), org.springframework.data.domain.PageRequest.of(safePage, safeSize), responses.size());
    }

    public ProductResponse product(UUID id) {
        Product product = productRepository.findById(id)
                .filter(Product::isActive)
                .orElseThrow(() -> new BoardlyException("Product not found", HttpStatus.NOT_FOUND.value()));
        return toResponse(product, true);
    }

    private ProductResponse toResponse(Product product, boolean includeDetail) {
        List<ProductMediaResponse> media = mediaRepository.findByProductIdOrderBySortOrderAsc(product.getId()).stream()
                .map(item -> new ProductMediaResponse(item.getId(), item.getMediaUrl(), item.getMediaType().name(), item.getAltText(), item.isPrimary(), item.getSortOrder()))
                .toList();
        List<ProductReview> reviews = reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(product.getId(), ProductReview.ReviewStatus.published);
        BigDecimal rating = reviews.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf(reviews.stream().mapToInt(ProductReview::getRating).average().orElse(0)).setScale(1, RoundingMode.HALF_UP);
        String image = media.stream().filter(ProductMediaResponse::primary).map(ProductMediaResponse::url).findFirst().orElse(null);
        long stock = inventoryRepository.availableStockByProductId(product.getId());
        List<ProductReviewResponse> reviewResponses = includeDetail ? reviews.stream().map(this::toReviewResponse).toList() : List.of();

        return new ProductResponse(
                product.getId(), product.getSku(), product.getName(), product.getCategory().getName(),
                product.getBasePrice(), product.getSalePrice(), range(product.getMinPlayers(), product.getMaxPlayers(), ""),
                range(product.getMinPlayTimeMinutes(), product.getMaxPlayTimeMinutes(), " min"),
                product.getMinAge() == null ? null : product.getMinAge() + "+", title(product.getDifficulty().name()),
                rating, reviews.size(), stock, image, product.getPublishedAt() != null && product.getPublishedAt().isAfter(OffsetDateTime.now().minusDays(30)),
                product.getDescription(), product.getPublisherName(), product.getDesignerName(), product.getLanguagesText(), media, reviewResponses
        );
    }

    private ProductReviewResponse toReviewResponse(ProductReview review) {
        String author = review.getUser() == null ? "Boardly customer" : review.getUser().getDisplayName();
        return new ProductReviewResponse(review.getId(), author, review.getRating(), review.getReviewText(), review.getCreatedAt());
    }

    private Specification<Product> activeProducts() {
        return (root, query, builder) -> builder.isTrue(root.get("isActive"));
    }

    private Specification<Product> nameContains(String search) {
        return (root, query, builder) -> builder.like(builder.lower(root.get("name")), "%" + search.toLowerCase(Locale.ROOT) + "%");
    }

    private Specification<Product> categoryMatches(String category) {
        return (root, query, builder) -> builder.equal(builder.lower(root.join("category").get("name")), category.toLowerCase(Locale.ROOT));
    }

    private Specification<Product> difficultyMatches(String difficulty) {
        try {
            Product.ProductDifficulty value = Product.ProductDifficulty.valueOf(difficulty.toLowerCase(Locale.ROOT));
            return (root, query, builder) -> builder.equal(root.get("difficulty"), value);
        } catch (IllegalArgumentException exception) {
            return (root, query, builder) -> builder.disjunction();
        }
    }

    private Comparator<ProductResponse> sortComparator(String sort) {
        String value = sort == null ? "featured" : sort.toLowerCase(Locale.ROOT);
        return switch (value) {
            case "priceasc", "price_asc" -> Comparator.comparing(ProductResponse::price);
            case "pricedesc", "price_desc" -> Comparator.comparing(ProductResponse::price).reversed();
            case "rating" -> Comparator.comparing(ProductResponse::rating).reversed();
            case "newest" -> Comparator.comparing(ProductResponse::isNew).reversed().thenComparing(ProductResponse::name);
            default -> Comparator.comparing(ProductResponse::name);
        };
    }

    private String range(Short min, Short max, String suffix) {
        if (min == null) return null;
        return min.equals(max) ? min + suffix : min + "-" + max + suffix;
    }

    private String title(String value) {
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

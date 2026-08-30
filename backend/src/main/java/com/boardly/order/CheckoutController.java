package com.boardly.order;

import java.util.List;

import com.boardly.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CheckoutController {
    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/api/checkout/options")
    public CheckoutDtos.CheckoutOptionsResponse options(@AuthenticationPrincipal AuthUser authUser) {
        return checkoutService.options(authUser);
    }

    @PostMapping("/api/checkout")
    public CheckoutDtos.OrderResponse checkout(@AuthenticationPrincipal AuthUser authUser,
                                                @Valid @RequestBody CheckoutDtos.CheckoutRequest request) {
        return checkoutService.checkout(authUser, request);
    }

    @GetMapping("/api/orders/{orderNumber}")
    public CheckoutDtos.OrderResponse getOrder(@AuthenticationPrincipal AuthUser authUser, @PathVariable String orderNumber) {
        return checkoutService.getOrder(authUser, orderNumber);
    }

    @GetMapping("/api/orders/me")
    public List<CheckoutDtos.OrderResponse> myOrders(@AuthenticationPrincipal AuthUser authUser) {
        return checkoutService.myOrders(authUser);
    }
}

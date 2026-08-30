package com.boardly.order;

import java.math.BigDecimal;

public interface PaymentService {
    Payment createPendingPayment(Order order, PaymentMethod paymentMethod, BigDecimal amount, String currency);
}

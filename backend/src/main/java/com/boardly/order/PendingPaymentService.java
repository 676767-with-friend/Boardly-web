package com.boardly.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/** Production-safe foundation: no provider is invoked and no raw payment credentials are accepted or stored. */
@Service
@Profile("!dev")
public class PendingPaymentService implements PaymentService {
    private final PaymentRepository paymentRepository;

    public PendingPaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Override
    public Payment createPendingPayment(Order order, PaymentMethod paymentMethod, BigDecimal amount, String currency) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentMethod(paymentMethod);
        payment.setAmount(amount);
        payment.setCurrency(currency);
        payment.setStatus(Payment.PaymentStatus.pending);
        payment.setCreatedAt(OffsetDateTime.now());
        return paymentRepository.save(payment);
    }
}

package com.boardly.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/** Development-only provider stand-in. It records a pending payment without handling payment credentials. */
@Service
@Profile("dev")
public class DevMockPaymentService implements PaymentService {
    private final PaymentRepository paymentRepository;

    public DevMockPaymentService(PaymentRepository paymentRepository) {
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
        payment.setProviderReference("dev-pending-" + UUID.randomUUID());
        payment.setCreatedAt(OffsetDateTime.now());
        return paymentRepository.save(payment);
    }
}

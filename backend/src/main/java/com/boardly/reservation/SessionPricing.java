package com.boardly.reservation;

import com.boardly.branch.BranchPricingRule;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;

final class SessionPricing {
    private SessionPricing() { }

    static Charge calculate(PlaySession session, OffsetDateTime at) {
        long elapsedSeconds = Math.max(0, Duration.between(session.getCheckInAt(), at).getSeconds());
        Reservation reservation = session.getReservation();
        if (reservation == null) {
            long billableHours = startedHours(Math.max(1, elapsedSeconds));
            BigDecimal fee = feeForHours(session.getPricingRule(), session.getPlayerCount(), billableHours);
            return new Charge(0, elapsedSeconds, 0, billableHours, fee, BigDecimal.ZERO.setScale(2), fee);
        }

        long reservedSeconds = Math.max(1,
                Duration.between(reservation.getStartsAt(), reservation.getEndsAt()).getSeconds());
        long reservedHours = startedHours(reservedSeconds);
        long overtimeSeconds = at.isAfter(reservation.getEndsAt())
                ? Math.max(1, Duration.between(reservation.getEndsAt(), at).getSeconds()) : 0;
        long overtimeHours = overtimeSeconds == 0 ? 0 : startedHours(overtimeSeconds);
        BigDecimal baseFee = reservation.getEstimatedFee() == null
                ? feeForHours(session.getPricingRule(), session.getPlayerCount(), reservedHours)
                : reservation.getEstimatedFee().setScale(2, RoundingMode.HALF_UP);
        BigDecimal overtimeFee = session.getPricingRule().getAdditionalHourPerPerson()
                .multiply(BigDecimal.valueOf(overtimeHours))
                .multiply(BigDecimal.valueOf(session.getPlayerCount()))
                .setScale(2, RoundingMode.HALF_UP);
        int bookedMinutes = Math.toIntExact(Math.max(1,
                Duration.between(reservation.getStartsAt(), reservation.getEndsAt()).toMinutes()));
        return new Charge(bookedMinutes, elapsedSeconds, overtimeSeconds, reservedHours + overtimeHours,
                baseFee, overtimeFee, baseFee.add(overtimeFee).setScale(2, RoundingMode.HALF_UP));
    }

    private static long startedHours(long seconds) {
        return Math.max(1, (seconds + 3599) / 3600);
    }

    private static BigDecimal feeForHours(BranchPricingRule rule, short players, long hours) {
        return rule.getFirstHourPerPerson()
                .add(rule.getAdditionalHourPerPerson().multiply(BigDecimal.valueOf(hours - 1)))
                .multiply(BigDecimal.valueOf(players)).setScale(2, RoundingMode.HALF_UP);
    }

    record Charge(int bookedDurationMinutes, long elapsedSeconds, long overtimeSeconds, long billableHours,
            BigDecimal baseFee, BigDecimal overtimeFee, BigDecimal finalFee) { }
}

package com.boardly.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.boardly.branch.BranchPricingRule;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class SessionPricingTests {
    private static final OffsetDateTime START = OffsetDateTime.parse("2026-10-28T12:00:00+07:00");
    private static final OffsetDateTime END = START.plusHours(2);

    @ParameterizedTest
    @CsvSource({
            "2026-10-28T13:30:00+07:00, 0, 2, 280.00",
            "2026-10-28T14:00:00+07:00, 0, 2, 280.00",
            "2026-10-28T14:00:01+07:00, 1, 3, 400.00",
            "2026-10-28T14:30:00+07:00, 1800, 3, 400.00",
            "2026-10-28T15:00:00+07:00, 3600, 3, 400.00",
            "2026-10-28T15:00:01+07:00, 3601, 4, 520.00"
    })
    void reservationOvertimeStartsAfterScheduledEndAndRoundsStartedHours(
            String checkout, long overtimeSeconds, long billableHours, String finalFee) {
        SessionPricing.Charge charge = SessionPricing.calculate(
                reservedSession(START.minusMinutes(30), centralRule(), (short) 2, new BigDecimal("280.00")),
                OffsetDateTime.parse(checkout));

        assertEquals(overtimeSeconds, charge.overtimeSeconds());
        assertEquals(billableHours, charge.billableHours());
        assertEquals(new BigDecimal(finalFee), charge.finalFee());
    }

    @ParameterizedTest
    @CsvSource({
            "59, 3540, 3, 400.00",
            "60, 3600, 3, 400.00",
            "61, 3660, 4, 520.00"
    })
    void overtimeAtFiftyNineSixtyAndSixtyOneMinutesUsesStartedHourRounding(
            long minutes, long overtimeSeconds, long billableHours, String finalFee) {
        SessionPricing.Charge charge = SessionPricing.calculate(
                reservedSession(START, centralRule(), (short) 2, new BigDecimal("280.00")),
                END.plusMinutes(minutes));

        assertEquals(overtimeSeconds, charge.overtimeSeconds());
        assertEquals(billableHours, charge.billableHours());
        assertEquals(new BigDecimal(finalFee), charge.finalFee());
    }

    @Test
    void earlyAndLateCheckInDoNotMoveTheScheduledEndBoundary() {
        SessionPricing.Charge early = SessionPricing.calculate(
                reservedSession(START.minusMinutes(30), centralRule(), (short) 2, new BigDecimal("280.00")), END);
        SessionPricing.Charge lateAtEnd = SessionPricing.calculate(
                reservedSession(START.plusMinutes(30), centralRule(), (short) 2, new BigDecimal("280.00")), END);
        SessionPricing.Charge lateOvertime = SessionPricing.calculate(
                reservedSession(START.plusMinutes(30), centralRule(), (short) 2, new BigDecimal("280.00")),
                END.plusMinutes(30));

        assertEquals(BigDecimal.ZERO.setScale(2), early.overtimeFee());
        assertEquals(BigDecimal.ZERO.setScale(2), lateAtEnd.overtimeFee());
        assertEquals(new BigDecimal("120.00"), lateOvertime.overtimeFee());
        assertEquals(new BigDecimal("400.00"), lateOvertime.finalFee());
    }

    @Test
    void preservesReservedBaseAndUsesTheSessionsBranchRateAndPlayerCountForOvertime() {
        SessionPricing.Charge charge = SessionPricing.calculate(
                reservedSession(START, silomRule(), (short) 3, new BigDecimal("390.00")),
                END.plusSeconds(1));

        assertEquals(new BigDecimal("390.00"), charge.baseFee());
        assertEquals(new BigDecimal("165.00"), charge.overtimeFee());
        assertEquals(new BigDecimal("555.00"), charge.finalFee());
    }

    @Test
    void walkInKeepsExistingElapsedStartedHourPolicy() {
        PlaySession session = session(START, centralRule(), (short) 2);

        assertEquals(new BigDecimal("160.00"),
                SessionPricing.calculate(session, START.plusHours(1)).finalFee());
        assertEquals(new BigDecimal("280.00"),
                SessionPricing.calculate(session, START.plusHours(1).plusSeconds(1)).finalFee());
    }

    @Test
    void calculationsUseInstantsAcrossOffsetsAndDateBoundariesAndNeverGoNegative() {
        OffsetDateTime start = OffsetDateTime.parse("2026-10-28T23:00:00+07:00");
        OffsetDateTime end = start.plusHours(2);
        PlaySession session = reservedSession(start.minusMinutes(30), centralRule(), (short) 2,
                new BigDecimal("280.00"), start, end);

        SessionPricing.Charge sameInstantAtEnd = SessionPricing.calculate(session,
                OffsetDateTime.parse("2026-10-28T18:00:00Z"));
        SessionPricing.Charge beforeCheckIn = SessionPricing.calculate(session, start.minusHours(1));

        assertEquals(0, sameInstantAtEnd.overtimeSeconds());
        assertEquals(new BigDecimal("280.00"), sameInstantAtEnd.finalFee());
        assertEquals(0, beforeCheckIn.elapsedSeconds());
        assertEquals(BigDecimal.ZERO.setScale(2), beforeCheckIn.overtimeFee());
    }

    private PlaySession reservedSession(OffsetDateTime checkInAt, BranchPricingRule rule, short players,
            BigDecimal estimatedFee) {
        return reservedSession(checkInAt, rule, players, estimatedFee, START, END);
    }

    private PlaySession reservedSession(OffsetDateTime checkInAt, BranchPricingRule rule, short players,
            BigDecimal estimatedFee, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        Reservation reservation = new Reservation();
        reservation.setStartsAt(startsAt);
        reservation.setEndsAt(endsAt);
        reservation.setEstimatedFee(estimatedFee);
        PlaySession session = session(checkInAt, rule, players);
        session.setReservation(reservation);
        return session;
    }

    private PlaySession session(OffsetDateTime checkInAt, BranchPricingRule rule, short players) {
        PlaySession session = new PlaySession();
        session.setCheckInAt(checkInAt);
        session.setPricingRule(rule);
        session.setPlayerCount(players);
        return session;
    }

    private BranchPricingRule centralRule() {
        return rule("80.00", "60.00");
    }

    private BranchPricingRule silomRule() {
        return rule("75.00", "55.00");
    }

    private BranchPricingRule rule(String firstHour, String additionalHour) {
        BranchPricingRule rule = new BranchPricingRule();
        rule.setFirstHourPerPerson(new BigDecimal(firstHour));
        rule.setAdditionalHourPerPerson(new BigDecimal(additionalHour));
        return rule;
    }
}

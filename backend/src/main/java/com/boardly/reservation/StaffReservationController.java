package com.boardly.reservation;

import com.boardly.auth.AuthUser;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff")
public class StaffReservationController {
    private final ReservationService service;
    public StaffReservationController(ReservationService service) { this.service = service; }
    @GetMapping("/branches/{branchId}/live-tables") public List<ReservationDtos.LiveTableResponse> live(@AuthenticationPrincipal AuthUser user, @PathVariable UUID branchId, @RequestParam(defaultValue = "4") short players) { return service.liveTables(user, branchId, players); }
    @GetMapping("/branches/{branchId}/reservations") public List<ReservationDtos.StaffReservationResponse> reservations(@AuthenticationPrincipal AuthUser user, @PathVariable UUID branchId, @RequestParam(required = false) LocalDate date, @RequestParam(required = false) String search) { return service.staffReservations(user, branchId, date, search); }
    @PostMapping("/reservations/{reservationId}/check-in") public ReservationDtos.LiveTableResponse checkIn(@AuthenticationPrincipal AuthUser user, @PathVariable UUID reservationId) { return service.checkIn(user, reservationId); }
    @PostMapping("/play-sessions/walk-in") public ReservationDtos.LiveTableResponse walkIn(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ReservationDtos.WalkInRequest request) { return service.walkIn(user, request); }
    @GetMapping("/play-sessions/{sessionId}/checkout") public ReservationDtos.CheckoutResponse checkoutPreview(@AuthenticationPrincipal AuthUser user, @PathVariable UUID sessionId) { return service.checkoutPreview(user, sessionId); }
    @PostMapping("/play-sessions/{sessionId}/checkout") public ReservationDtos.CheckoutResponse checkout(@AuthenticationPrincipal AuthUser user, @PathVariable UUID sessionId, @RequestBody ReservationDtos.CheckoutRequest request) { return service.checkout(user, sessionId, request); }
}

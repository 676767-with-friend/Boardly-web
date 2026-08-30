package com.boardly.reservation;

import com.boardly.auth.AuthUser;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReservationController {
    private final ReservationService service;
    public ReservationController(ReservationService service) { this.service = service; }

    @GetMapping("/branches/{branchId}/available-tables")
    public ReservationDtos.AvailabilityResponse available(@PathVariable UUID branchId, @RequestParam OffsetDateTime startsAt,
                                                           @RequestParam OffsetDateTime endsAt, @RequestParam short players) {
        return service.available(branchId, startsAt, endsAt, players);
    }
    @PostMapping("/reservations") public ReservationDtos.ReservationResponse create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ReservationDtos.CreateReservationRequest request) { return service.create(user, request); }
    @GetMapping("/reservations/me") public List<ReservationDtos.ReservationResponse> mine(@AuthenticationPrincipal AuthUser user) { return service.mine(user); }
    @GetMapping("/reservations/{number}") public ReservationDtos.ReservationResponse reservation(@AuthenticationPrincipal AuthUser user, @PathVariable String number) { return service.reservation(user, number); }
    @PatchMapping("/reservations/{number}/cancel") public ReservationDtos.ReservationResponse cancel(@AuthenticationPrincipal AuthUser user, @PathVariable String number, @RequestBody(required = false) ReservationDtos.CancelReservationRequest request) { return service.cancel(user, number, request); }
}

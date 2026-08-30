package com.boardly.auth;

import com.boardly.auth.AuthDtos.AuthResponse;
import com.boardly.auth.AuthDtos.ForgotPasswordRequest;
import com.boardly.auth.AuthDtos.ForgotPasswordResponse;
import com.boardly.auth.AuthDtos.LoginRequest;
import com.boardly.auth.AuthDtos.LogoutRequest;
import com.boardly.auth.AuthDtos.MessageResponse;
import com.boardly.auth.AuthDtos.RefreshRequest;
import com.boardly.auth.AuthDtos.RegisterRequest;
import com.boardly.auth.AuthDtos.ResetPasswordRequest;
import com.boardly.auth.AuthDtos.UserResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/auth/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(
            @RequestBody(required = false) LogoutRequest request,
            @AuthenticationPrincipal AuthUser currentUser) {
        authService.logout(request, currentUser == null ? null : currentUser.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auth/forgot-password")
    public ForgotPasswordResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/auth/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return new MessageResponse("Your password has been reset. Please sign in.");
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthUser currentUser) {
        return authService.currentUser(currentUser.id());
    }
}

package com.boardly.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonInclude;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank(message = "First name is required") @Size(max = 100) String firstName,
            @NotBlank(message = "Last name is required") @Size(max = 100) String lastName,
            @Size(max = 100) String displayName,
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 255) String email,
            @Size(max = 30) String phone,
            @NotBlank(message = "Password is required") @Size(min = 12, max = 128, message = "Password must be 12 to 128 characters") String password,
            @NotNull(message = "Terms acceptance is required") Boolean acceptTerms,
            @NotNull(message = "Privacy acceptance is required") Boolean acceptPrivacy) {
    }

    public record LoginRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
            @NotBlank(message = "Password is required") String password,
            boolean rememberMe) {
    }

    public record RefreshRequest(@NotBlank(message = "Refresh token is required") String refreshToken) {
    }

    public record LogoutRequest(String refreshToken) {
    }

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank(message = "Reset token is required") String token,
            @NotBlank(message = "New password is required") @Size(min = 12, max = 128, message = "Password must be 12 to 128 characters") String newPassword) {
    }

    public record AuthResponse(String accessToken, String refreshToken, UserResponse user) {
    }

    public record UserResponse(UUID id, String firstName, String lastName, String displayName, String email,
            List<String> roles, List<String> permissions) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ForgotPasswordResponse(String message, String devResetUrl) {
    }

    public record MessageResponse(String message) {
    }
}

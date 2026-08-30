package com.boardly.auth;

import com.boardly.auth.AuthDtos.AuthResponse;
import com.boardly.auth.AuthDtos.ForgotPasswordResponse;
import com.boardly.auth.AuthDtos.ForgotPasswordRequest;
import com.boardly.auth.AuthDtos.LoginRequest;
import com.boardly.auth.AuthDtos.LogoutRequest;
import com.boardly.auth.AuthDtos.RefreshRequest;
import com.boardly.auth.AuthDtos.RegisterRequest;
import com.boardly.auth.AuthDtos.ResetPasswordRequest;
import com.boardly.auth.AuthDtos.UserResponse;
import com.boardly.common.exception.BoardlyException;
import com.boardly.user.Role;
import com.boardly.user.RoleRepository;
import com.boardly.user.User;
import com.boardly.user.UserConsent;
import com.boardly.user.UserConsentRepository;
import com.boardly.user.UserRepository;
import com.boardly.user.UserRole;
import com.boardly.user.UserRoleId;
import com.boardly.user.UserRoleRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements EnvironmentAware {
    private static final String CONSENT_VERSION = "2026-08-01";
    private static final String GENERIC_FORGOT_PASSWORD_MESSAGE = "If an active account matches that email, reset instructions have been created.";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserConsentRepository userConsentRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenHasher tokenHasher;
    private final JwtService jwtService;
    private final long refreshExpirySeconds;
    private final long resetExpirySeconds;
    private final String frontendBaseUrl;
    private final boolean devResetTokenExposure;
    private Environment environment;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            UserConsentRepository userConsentRepository,
            AuthSessionRepository authSessionRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            TokenHasher tokenHasher,
            JwtService jwtService,
            @Value("${boardly.auth.refresh-expiry-seconds}") long refreshExpirySeconds,
            @Value("${boardly.auth.reset-expiry-seconds}") long resetExpirySeconds,
            @Value("${boardly.auth.frontend-base-url}") String frontendBaseUrl,
            @Value("${boardly.auth.dev-reset-token-exposure:false}") boolean devResetTokenExposure) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.userConsentRepository = userConsentRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenHasher = tokenHasher;
        this.jwtService = jwtService;
        this.refreshExpirySeconds = refreshExpirySeconds;
        this.resetExpirySeconds = resetExpirySeconds;
        this.frontendBaseUrl = frontendBaseUrl;
        this.devResetTokenExposure = devResetTokenExposure;
    }

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!Boolean.TRUE.equals(request.acceptTerms()) || !Boolean.TRUE.equals(request.acceptPrivacy())) {
            throw new BoardlyException("Terms and privacy acceptance are required", 400, "CONSENT_REQUIRED");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new BoardlyException("An account already exists for that email", 409, "EMAIL_ALREADY_REGISTERED");
        }

        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setDisplayName(blankToNull(request.displayName()));
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(User.UserStatus.active);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user = userRepository.save(user);

        Role customerRole = roleRepository.findByCodeAndIsActiveTrue("customer")
                .orElseThrow(() -> new IllegalStateException("The required customer role is not configured"));
        UserRole userRole = new UserRole();
        userRole.setId(new UserRoleId(user.getId(), customerRole.getId()));
        userRole.setUser(user);
        userRole.setRole(customerRole);
        userRole.setAssignedAt(now);
        userRoleRepository.save(userRole);
        saveConsent(user, UserConsent.DocumentType.terms, now);
        saveConsent(user, UserConsent.DocumentType.privacy, now);

        return createSessionResponse(user, false);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .filter(this::isActive)
                .orElseThrow(() -> invalidCredentials());
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        user.setLastLoginAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);
        return createSessionResponse(user, request.rememberMe());
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String rawToken = request.refreshToken();
        AuthSession currentSession = authSessionRepository.findByTokenHash(tokenHasher.hash(rawToken))
                .filter(this::isSessionActive)
                .orElseThrow(() -> new BoardlyException("Refresh session is invalid or expired", 401, "INVALID_REFRESH_TOKEN"));
        currentSession.setRevokedAt(OffsetDateTime.now());
        authSessionRepository.save(currentSession);
        return createSessionResponse(currentSession.getUser(), currentSession.isRememberMe());
    }

    @Transactional
    public void logout(LogoutRequest request, UUID authenticatedSessionId) {
        OffsetDateTime now = OffsetDateTime.now();
        if (authenticatedSessionId != null) {
            authSessionRepository.findById(authenticatedSessionId).ifPresent(session -> {
                if (session.getRevokedAt() == null) {
                    session.setRevokedAt(now);
                    authSessionRepository.save(session);
                }
            });
        }
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            authSessionRepository.findByTokenHash(tokenHasher.hash(request.refreshToken())).ifPresent(session -> {
                if (session.getRevokedAt() == null) {
                    session.setRevokedAt(now);
                    authSessionRepository.save(session);
                }
            });
        }
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email())).orElse(null);
        if (user == null || !isActive(user)) {
            return new ForgotPasswordResponse(GENERIC_FORGOT_PASSWORD_MESSAGE, null);
        }

        OffsetDateTime now = OffsetDateTime.now();
        passwordResetTokenRepository.consumeUnusedByUserId(user.getId(), now);
        String rawToken = tokenHasher.newRawToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(tokenHasher.hash(rawToken));
        resetToken.setExpiresAt(now.plusSeconds(resetExpirySeconds));
        resetToken.setCreatedAt(now);
        passwordResetTokenRepository.save(resetToken);

        String devResetUrl = isDevResetDeliveryEnabled()
                ? frontendBaseUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken
                : null;
        return new ForgotPasswordResponse(GENERIC_FORGOT_PASSWORD_MESSAGE, devResetUrl);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHasher.hash(request.token()))
                .filter(this::isResetTokenUsable)
                .orElseThrow(() -> new BoardlyException("Reset token is invalid or expired", 400, "INVALID_RESET_TOKEN"));
        OffsetDateTime now = OffsetDateTime.now();
        User user = resetToken.getUser();
        if (!isActive(user)) {
            throw new BoardlyException("Reset token is invalid or expired", 400, "INVALID_RESET_TOKEN");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(now);
        userRepository.save(user);
        resetToken.setUsedAt(now);
        passwordResetTokenRepository.save(resetToken);
        passwordResetTokenRepository.consumeUnusedByUserId(user.getId(), now);
        authSessionRepository.revokeAllActiveByUserId(user.getId(), now);
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .filter(this::isActive)
                .orElseThrow(() -> new BoardlyException("Authentication is required", 401, "UNAUTHENTICATED"));
        return toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthUser loadAuthUser(UUID userId) {
        User user = userRepository.findById(userId).filter(this::isActive).orElse(null);
        if (user == null) {
            return null;
        }
        List<String> roles = userRoleRepository.findActiveRoleCodesByUserId(userId);
        List<String> permissions = userRoleRepository.findPermissionCodesByUserId(userId);
        List<SimpleGrantedAuthority> authorities = new java.util.ArrayList<>();
        roles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT))));
        permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority("PERMISSION_" + permission)));
        return new AuthUser(user.getId(), user.getEmail(), roles, permissions, authorities);
    }

    private AuthResponse createSessionResponse(User user, boolean rememberMe) {
        OffsetDateTime now = OffsetDateTime.now();
        String rawRefreshToken = tokenHasher.newRawToken();
        AuthSession session = new AuthSession();
        session.setUser(user);
        session.setTokenHash(tokenHasher.hash(rawRefreshToken));
        session.setRememberMe(rememberMe);
        session.setExpiresAt(now.plusSeconds(refreshExpirySeconds));
        session.setCreatedAt(now);
        session = authSessionRepository.save(session);
        return new AuthResponse(jwtService.issueAccessToken(user.getId(), session.getId()), rawRefreshToken, toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        List<String> roles = userRoleRepository.findActiveRoleCodesByUserId(user.getId());
        List<String> permissions = userRoleRepository.findPermissionCodesByUserId(user.getId());
        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getDisplayName(), user.getEmail(), roles, permissions);
    }

    private void saveConsent(User user, UserConsent.DocumentType documentType, OffsetDateTime acceptedAt) {
        UserConsent consent = new UserConsent();
        consent.setUser(user);
        consent.setDocumentType(documentType);
        consent.setDocumentVersion(CONSENT_VERSION);
        consent.setAcceptedAt(acceptedAt);
        userConsentRepository.save(consent);
    }

    private boolean isSessionActive(AuthSession session) {
        return session.getRevokedAt() == null && session.getExpiresAt().isAfter(OffsetDateTime.now()) && isActive(session.getUser());
    }

    private boolean isResetTokenUsable(PasswordResetToken token) {
        return token.getUsedAt() == null && token.getExpiresAt().isAfter(OffsetDateTime.now());
    }

    private boolean isActive(User user) {
        return user.getStatus() == User.UserStatus.active && user.getDeletedAt() == null;
    }

    private boolean isDevResetDeliveryEnabled() {
        return devResetTokenExposure && environment != null && environment.acceptsProfiles(Profiles.of("dev"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BoardlyException invalidCredentials() {
        return new BoardlyException("Invalid email or password", HttpStatus.UNAUTHORIZED.value(), "INVALID_CREDENTIALS");
    }
}

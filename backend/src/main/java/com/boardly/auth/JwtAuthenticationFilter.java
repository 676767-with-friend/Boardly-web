package com.boardly.auth;

import com.boardly.config.JsonSecurityErrorHandler;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AuthSessionRepository authSessionRepository;
    private final AuthService authService;
    private final JsonSecurityErrorHandler errorHandler;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            AuthSessionRepository authSessionRepository,
            AuthService authService,
            JsonSecurityErrorHandler errorHandler) {
        this.jwtService = jwtService;
        this.authSessionRepository = authSessionRepository;
        this.authService = authService;
        this.errorHandler = errorHandler;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            JwtService.JwtClaims claims = jwtService.parse(authorization.substring(7));
            AuthSession session = authSessionRepository.findActiveByIdWithUser(claims.sessionId())
                    .filter(value -> value.getUser().getId().equals(claims.userId()))
                    .filter(value -> value.getExpiresAt().isAfter(java.time.OffsetDateTime.now()))
                    .orElseThrow(JwtService.InvalidJwtException::new);
            AuthUser principal = authService.loadAuthUser(session.getUser().getId());
            if (principal == null) {
                throw new JwtService.InvalidJwtException();
            }
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
            filterChain.doFilter(request, response);
        } catch (JwtService.InvalidJwtException ex) {
            SecurityContextHolder.clearContext();
            errorHandler.write(response, org.springframework.http.HttpStatus.UNAUTHORIZED, "INVALID_ACCESS_TOKEN", "Authentication is required");
        }
    }
}

package com.boardly.config;

import com.boardly.auth.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JsonSecurityErrorHandler jsonSecurityErrorHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, JsonSecurityErrorHandler jsonSecurityErrorHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jsonSecurityErrorHandler = jsonSecurityErrorHandler;
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("Password authentication is handled by Boardly auth endpoints");
        };
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(jsonSecurityErrorHandler)
                .accessDeniedHandler(jsonSecurityErrorHandler)
            )
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/health", "/api/auth/**", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/product-categories", "/api/products/**", "/api/branches/**").permitAll()
                .requestMatchers("/api/cart/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}

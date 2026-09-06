package com.petcare.backend.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

public class AuthenticationRateLimitFilter extends OncePerRequestFilter {

    private static final Map<String, Limit> LIMITS = Map.of(
            "POST /api/v1/auth/login", new Limit(30, Duration.ofMinutes(10)),
            "POST /api/v1/auth/signup", new Limit(10, Duration.ofHours(1)),
            "POST /api/v1/auth/forgot-password", new Limit(5, Duration.ofHours(1)),
            "POST /api/v1/auth/oauth2/exchange", new Limit(30, Duration.ofMinutes(10)),
            "POST /api/v1/auth/refresh", new Limit(120, Duration.ofMinutes(10)),
            "GET /api/v1/auth/check-email", new Limit(60, Duration.ofMinutes(1)),
            "GET /api/v1/auth/check-nickname", new Limit(60, Duration.ofMinutes(1))
    );

    private final RequestRateLimiter requestRateLimiter;

    public AuthenticationRateLimitFilter(RequestRateLimiter requestRateLimiter) {
        this.requestRateLimiter = requestRateLimiter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestKey = request.getMethod() + " " + request.getRequestURI();
        Limit limit = LIMITS.get(requestKey);
        if (limit == null) {
            filterChain.doFilter(request, response);
            return;
        }

        RequestRateLimiter.Decision decision = requestRateLimiter.tryAcquire(
                "auth:" + requestKey + ":" + request.getRemoteAddr(),
                limit.requests(), limit.window());
        if (decision.allowed()) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.retryAfterSeconds()));
        response.getWriter().write(
                "{\"status\":\"FAIL\",\"message\":\"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.\"}");
    }

    private record Limit(int requests, Duration window) {
    }
}

package com.petcare.backend.domain.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;

/**
 * OAuth Login Code를 발급받은 Browser에 짧게 묶어 session swapping을 막는다.
 */
@Service
public class OAuth2LoginCodeCookieService {

    public static final String COOKIE_NAME = "petcare_oauth_exchange";
    private static final Duration MAX_AGE = Duration.ofSeconds(60);

    private final boolean secure;
    private final String sameSite;

    public OAuth2LoginCodeCookieService(
            @Value("${jwt.refresh-cookie.secure:false}") boolean secure,
            @Value("${jwt.refresh-cookie.same-site:Strict}") String sameSite
    ) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    public void write(HttpServletResponse response, String loginCode) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(loginCode, MAX_AGE).toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
    }

    public boolean matches(String cookieCode, String requestCode) {
        if (cookieCode == null || requestCode == null
                || cookieCode.isBlank() || requestCode.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                cookieCode.getBytes(StandardCharsets.UTF_8),
                requestCode.getBytes(StandardCharsets.UTF_8));
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/api/v1/auth/oauth2/exchange")
                .maxAge(maxAge)
                .build();
    }
}

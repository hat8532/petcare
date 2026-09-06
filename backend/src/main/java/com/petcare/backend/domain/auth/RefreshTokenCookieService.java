package com.petcare.backend.domain.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RefreshTokenCookieService {

    public static final String COOKIE_NAME = "petcare_refresh";

    private final boolean secure;
    private final String sameSite;
    private final Duration maxAge;

    public RefreshTokenCookieService(
            @Value("${jwt.refresh-cookie.secure:false}") boolean secure,
            @Value("${jwt.refresh-cookie.same-site:Strict}") String sameSite,
            @Value("${jwt.refresh-cookie.max-age-seconds:1209600}") long maxAgeSeconds
    ) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAge = Duration.ofSeconds(maxAgeSeconds);
    }

    public void write(HttpServletResponse response, String refreshToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(refreshToken, maxAge).toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
    }

    private ResponseCookie cookie(String value, Duration cookieMaxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/api/v1/auth")
                .maxAge(cookieMaxAge)
                .build();
    }
}

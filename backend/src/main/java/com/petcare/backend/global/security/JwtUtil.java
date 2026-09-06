package com.petcare.backend.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);
    private static final String TOKEN_TYPE_CLAIM = "tokenType";
    private static final String ACCESS_TOKEN_TYPE = "ACCESS";
    private static final String REFRESH_TOKEN_TYPE = "REFRESH";
    private final SecretKey secretKey;
    private final long accessTokenExpirationMs = 1000L * 60 * 15; // 15분
    private final long refreshTokenExpirationMs = 1000L * 60 * 60 * 24 * 14; // 14일

    public JwtUtil(@Value("${jwt.secret:}") String secret) {
        if (secret == null || secret.isBlank()) {
            this.secretKey = Jwts.SIG.HS256.key().build();
            log.warn("jwt.secret이 없어 이번 Process에서만 유효한 임시 JWT Key를 생성했습니다. 운영환경에는 JWT_SECRET을 반드시 설정하세요.");
            return;
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId, String email, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(Long userId, String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(email)
                .id(UUID.randomUUID().toString())
                .claim("userId", userId)
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateAccessToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            String role = claims.get("role", String.class);
            return ACCESS_TOKEN_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))
                    && claims.getSubject() != null && !claims.getSubject().isBlank()
                    && claims.get("userId") instanceof Number
                    && role != null && role.startsWith("ROLE_");
        } catch (Exception e) {
            return false;
        }
    }

    public boolean validateRefreshToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return REFRESH_TOKEN_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))
                    && claims.getSubject() != null && !claims.getSubject().isBlank()
                    && claims.get("userId") instanceof Number
                    && claims.getId() != null && !claims.getId().isBlank();
        } catch (Exception e) {
            return false;
        }
    }
}

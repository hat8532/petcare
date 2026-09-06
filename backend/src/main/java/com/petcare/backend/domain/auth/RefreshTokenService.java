package com.petcare.backend.domain.auth;

import com.petcare.backend.global.security.JwtUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class RefreshTokenService {

    private final RefreshTokenMapper refreshTokenMapper;
    private final JwtUtil jwtUtil;

    public RefreshTokenService(RefreshTokenMapper refreshTokenMapper, JwtUtil jwtUtil) {
        this.refreshTokenMapper = refreshTokenMapper;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public void store(Long userId, String refreshToken) {
        LocalDateTime now = LocalDateTime.now();
        refreshTokenMapper.deleteExpired(now);
        refreshTokenMapper.insert(userId, hash(refreshToken), expiryDate(refreshToken));
    }

    @Transactional
    public boolean rotate(Long userId, String currentRefreshToken, String newRefreshToken) {
        int consumed = refreshTokenMapper.deleteValid(
                userId, hash(currentRefreshToken), LocalDateTime.now());
        if (consumed != 1) return false;

        refreshTokenMapper.insert(userId, hash(newRefreshToken), expiryDate(newRefreshToken));
        return true;
    }

    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        refreshTokenMapper.deleteByTokenHash(hash(refreshToken));
    }

    @Transactional
    public void revokeAll(Long userId) {
        if (userId != null) refreshTokenMapper.deleteByUserId(userId);
    }

    private LocalDateTime expiryDate(String refreshToken) {
        return LocalDateTime.ofInstant(
                jwtUtil.getClaimsFromToken(refreshToken).getExpiration().toInstant(),
                ZoneId.systemDefault());
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", e);
        }
    }
}

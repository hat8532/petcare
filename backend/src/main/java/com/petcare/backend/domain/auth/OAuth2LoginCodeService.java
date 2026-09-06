package com.petcare.backend.domain.auth;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OAuth Redirect URL에 JWT를 노출하지 않기 위한 단일 사용 교환 Code 저장소다.
 * 단일 Instance 시연용이며, 다중 Instance 운영에서는 Redis 같은 공유 저장소가 필요하다.
 */
@Service
public class OAuth2LoginCodeService {

    private static final Duration CODE_TTL = Duration.ofSeconds(60);
    private static final int MAX_CODES = 1_000;

    private final SecureRandom secureRandom = new SecureRandom();
    private final ConcurrentHashMap<String, LoginEntry> codes = new ConcurrentHashMap<>();

    public String issue(AuthDTO.AuthResponse authResponse) {
        long now = System.currentTimeMillis();
        removeExpired(now);
        if (codes.size() >= MAX_CODES) {
            throw new IllegalStateException("OAuth Login Code 저장 한도를 초과했습니다.");
        }

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        codes.put(code, new LoginEntry(authResponse, now + CODE_TTL.toMillis()));
        return code;
    }

    public Optional<AuthDTO.AuthResponse> consume(String code) {
        if (code == null || code.isBlank() || code.length() > 128) return Optional.empty();

        LoginEntry entry = codes.remove(code);
        if (entry == null || entry.expiresAtMillis() < System.currentTimeMillis()) {
            return Optional.empty();
        }
        return Optional.of(entry.authResponse());
    }

    private void removeExpired(long now) {
        codes.entrySet().removeIf(entry -> entry.getValue().expiresAtMillis() < now);
    }

    private record LoginEntry(AuthDTO.AuthResponse authResponse, long expiresAtMillis) {
    }
}

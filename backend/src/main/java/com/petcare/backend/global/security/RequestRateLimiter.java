package com.petcare.backend.global.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 단일 Backend Process에서 외부 API Proxy 남용을 완화하는 고정 Window 제한기다.
 * 다중 Instance 운영에서는 Redis나 API Gateway 기반 제한기로 교체해야 한다.
 */
@Component
public class RequestRateLimiter {

    private static final int MAX_TRACKED_KEYS = 10_000;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public Decision tryAcquire(String key, int limit, Duration windowDuration) {
        if (key == null || key.isBlank() || limit <= 0 || windowDuration == null
                || windowDuration.isZero() || windowDuration.isNegative()) {
            throw new IllegalArgumentException("Rate limit 설정이 올바르지 않습니다.");
        }

        long now = System.currentTimeMillis();
        long windowMillis = windowDuration.toMillis();

        if (windows.size() >= MAX_TRACKED_KEYS && !windows.containsKey(key)) {
            removeExpiredWindows(now);
            if (windows.size() >= MAX_TRACKED_KEYS) {
                return new Decision(false, Math.max(1L, windowDuration.toSeconds()));
            }
        }

        AtomicReference<Decision> decision = new AtomicReference<>();
        windows.compute(key, (ignored, current) -> {
            if (current == null || now - current.startedAtMillis() >= current.windowMillis()) {
                decision.set(new Decision(true, 0));
                return new Window(now, windowMillis, 1);
            }

            if (current.count() >= limit) {
                long remainingMillis = current.windowMillis() - (now - current.startedAtMillis());
                decision.set(new Decision(false, Math.max(1L, (remainingMillis + 999L) / 1000L)));
                return current;
            }

            decision.set(new Decision(true, 0));
            return new Window(current.startedAtMillis(), current.windowMillis(), current.count() + 1);
        });

        return decision.get();
    }

    private void removeExpiredWindows(long now) {
        windows.entrySet().removeIf(entry ->
                now - entry.getValue().startedAtMillis() >= entry.getValue().windowMillis());
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {
    }

    private record Window(long startedAtMillis, long windowMillis, int count) {
    }
}

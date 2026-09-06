package com.petcare.backend.domain.chat;

import com.petcare.backend.global.ai.GeminiService;
import com.petcare.backend.global.security.RequestRateLimiter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final GeminiService geminiService;
    private final RequestRateLimiter requestRateLimiter;

    public ChatController(GeminiService geminiService, RequestRateLimiter requestRateLimiter) {
        this.geminiService = geminiService;
        this.requestRateLimiter = requestRateLimiter;
    }

    @PostMapping("/daily")
    public ResponseEntity<Map<String, Object>> dailyChat(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        Object rawMessage = request.get("message");
        if (!(rawMessage instanceof String userMsg) || userMsg.isBlank() || userMsg.length() > 1000) {
            return badRequest("질문은 1자 이상 1,000자 이하로 입력해 주세요.");
        }

        userMsg = userMsg.trim();
        String petName = normalizedText(request.get("petName"), "반려동물", 50);
        String petSpecies = normalizedText(request.get("petSpecies"), "반려동물", 50);

        String actor = authentication == null ? "anonymous" : authentication.getName();
        RequestRateLimiter.Decision limit = requestRateLimiter.tryAcquire(
                "chat:" + actor, 20, Duration.ofMinutes(1));
        if (!limit.allowed()) {
            return rateLimited(limit.retryAfterSeconds());
        }

        Map<String, Object> response = new HashMap<>();

        if (geminiService.isConfigured() && userMsg != null && !userMsg.isBlank()) {
            String prompt = String.format(
                    "당신은 반려동물 라이프스타일 및 수의학 AI 어시스턴트입니다.\n" +
                    "반려동물 이름: %s (종류: %s)\n" +
                    "사용자 질문: \"%s\"\n\n" +
                    "친절하고 친근한 어조로 이모지를 활용하여 한국어로 짧고 명확하게 실시간 맞춤 조언을 작성해 주세요.",
                    petName, petSpecies, userMsg
            );

            String aiReply = geminiService.generateContent(prompt);

            if (aiReply != null && !aiReply.isBlank()) {
                response.put("status", "SUCCESS");
                response.put("aiReply", aiReply);
                return ResponseEntity.ok(response);
            }
        }

        response.put("status", "FALLBACK");
        response.put("aiReply", null);
        return ResponseEntity.ok(response);
    }

    private String normalizedText(Object value, String fallback, int maxLength) {
        if (!(value instanceof String text) || text.isBlank()) return fallback;
        String normalized = text.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private ResponseEntity<Map<String, Object>> badRequest(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAIL");
        response.put("message", message);
        return ResponseEntity.badRequest().body(response);
    }

    private ResponseEntity<Map<String, Object>> rateLimited(long retryAfterSeconds) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAIL");
        response.put("message", "AI 상담 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
        return ResponseEntity.status(429)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds))
                .body(response);
    }
}

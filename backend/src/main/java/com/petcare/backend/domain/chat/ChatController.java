package com.petcare.backend.domain.chat;

import com.petcare.backend.global.ai.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final GeminiService geminiService;

    public ChatController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/daily")
    public ResponseEntity<Map<String, Object>> dailyChat(@RequestBody Map<String, Object> request) {
        String userMsg = (String) request.getOrDefault("message", "");
        String petName = (String) request.getOrDefault("petName", "반려동물");
        String petSpecies = (String) request.getOrDefault("petSpecies", "반려동물");

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
}

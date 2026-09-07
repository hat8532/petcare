package com.petcare.backend.global.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.key:YOUR_GEMINI_API_KEY_HERE}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent}")
    private String apiUrl;

    private static final List<String> FALLBACK_MODEL_URLS = List.of(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
    );

    private final RestTemplate restTemplate = createRestTemplate();

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        return new RestTemplate(factory);
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !"YOUR_GEMINI_API_KEY_HERE".equals(apiKey);
    }

    public String generateContent(String prompt) {
        if (!isConfigured()) {
            log.warn("Gemini API key is not configured.");
            return null;
        }

        List<String> targetUrls = new ArrayList<>();
        if (apiUrl != null && !apiUrl.isBlank()) {
            targetUrls.add(apiUrl);
        }
        for (String fallback : FALLBACK_MODEL_URLS) {
            if (!targetUrls.contains(fallback)) {
                targetUrls.add(fallback);
            }
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> partsContent = Map.of("parts", List.of(textPart));
        Map<String, Object> requestBody = Map.of("contents", List.of(partsContent));
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        for (String targetUrl : targetUrls) {
            try {
                String fullUrl = targetUrl.contains("?") ? targetUrl + "&key=" + apiKey : targetUrl + "?key=" + apiKey;
                ResponseEntity<Map> response = restTemplate.postForEntity(fullUrl, entity, Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map body = response.getBody();
                    List candidates = (List) body.get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map candidate = (Map) candidates.get(0);
                        Map content = (Map) candidate.get("content");
                        if (content != null) {
                            List parts = (List) content.get("parts");
                            if (parts != null && !parts.isEmpty()) {
                                Map part = (Map) parts.get(0);
                                String text = (String) part.get("text");
                                if (text != null && !text.isBlank()) {
                                    return text;
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Gemini call failed for endpoint {}: {}", targetUrl, e.getMessage());
            }
        }

        log.error("All Gemini API endpoints failed for prompt request.");
        return null;
    }
}

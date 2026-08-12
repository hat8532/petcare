package com.petcare.backend.global.news;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class NaverNewsService {

    @Value("${naver.map.client-id:}")
    private String mapClientId;

    @Value("${naver.map.client-secret:}")
    private String mapClientSecret;

    @Value("${naver.news.client-id:}")
    private String newsClientId;

    @Value("${naver.news.client-secret:}")
    private String newsClientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isConfigured() {
        return (newsClientId != null && !newsClientId.isBlank()) || (mapClientId != null && !mapClientId.isBlank());
    }

    public List<Map<String, Object>> searchPetNews(String query, int display) {
        String cId = (newsClientId != null && !newsClientId.isBlank()) ? newsClientId : mapClientId;
        String cSec = (newsClientSecret != null && !newsClientSecret.isBlank()) ? newsClientSecret : mapClientSecret;

        if (cId == null || cId.isBlank()) {
            return Collections.emptyList();
        }

        // 1. Try NAVER API HUB Endpoint (NCP)
        try {
            String encodedQuery = java.net.URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = String.format("https://naverapihub.apigw.ntruss.com/search/v1/news?query=%s&display=%d&sort=date", encodedQuery, display);

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-NCP-APIGW-API-KEY-ID", cId.trim());
            headers.set("X-NCP-APIGW-API-KEY", cSec.trim());

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody().get("items");
                if (items != null && !items.isEmpty()) {
                    return parseItems(items);
                }
            }
        } catch (Exception e) {
            System.err.println("NAVER API HUB News Search Error: " + e.getMessage());
        }

        // 2. Fallback to Developers API Endpoint
        try {
            String encodedQuery = java.net.URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = String.format("https://openapi.naver.com/v1/search/news.json?query=%s&display=%d&sort=date", encodedQuery, display);

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", cId.trim());
            headers.set("X-Naver-Client-Secret", cSec.trim());

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody().get("items");
                if (items != null && !items.isEmpty()) {
                    return parseItems(items);
                }
            }
        } catch (Exception e) {
            System.err.println("Naver Developers News Search Error: " + e.getMessage());
        }

        return Collections.emptyList();
    }

    private List<Map<String, Object>> parseItems(List<Map<String, Object>> items) {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] thumbnails = {
            "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80"
        };

        int idx = 0;
        for (Map<String, Object> item : items) {
            Map<String, Object> news = new HashMap<>();
            String rawTitle = (String) item.get("title");
            String cleanTitle = cleanHtmlAndDecode(rawTitle);
            
            String rawDesc = (String) item.get("description");
            String cleanDesc = cleanHtmlAndDecode(rawDesc);

            String pubDate = (String) item.get("pubDate");
            String formattedDate = pubDate;
            try {
                if (pubDate != null && pubDate.length() > 16) {
                    formattedDate = pubDate.substring(5, 16);
                }
            } catch (Exception ignored) {}

            news.put("id", idx + 1);
            news.put("title", cleanTitle);
            news.put("description", cleanDesc);
            news.put("url", item.get("link"));
            news.put("publishedDate", formattedDate);
            news.put("source", "네이버 실시간 뉴스");
            news.put("category", idx % 3 == 0 ? "HEALTH" : idx % 3 == 1 ? "NUTRITION" : "POLICY");
            news.put("categoryLabel", idx % 3 == 0 ? "의학/건강" : idx % 3 == 1 ? "영양/사료" : "정책/라이프");
            news.put("image", thumbnails[idx % thumbnails.length]);
            news.put("views", 1200 + (idx * 340));
            result.add(news);
            idx++;
        }
        return result;
    }

    private String cleanHtmlAndDecode(String input) {
        if (input == null || input.isBlank()) return "";
        String text = input.replaceAll("<[^>]*>", "").replaceAll("&quot;", "\"").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
        try {
            if (text.contains("%")) {
                text = URLDecoder.decode(text, StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {}
        return text;
    }
}

package com.petcare.backend.global.news;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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
        // 1. Try Naver Developers API Endpoint
        String cId = (newsClientId != null && !newsClientId.isBlank()) ? newsClientId : mapClientId;
        String cSec = (newsClientSecret != null && !newsClientSecret.isBlank()) ? newsClientSecret : mapClientSecret;

        if (cId != null && !cId.isBlank()) {
            try {
                String encodedQuery = java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8);
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
                // Fallthrough to NCP Gateway check
            }
        }

        return Collections.emptyList();
    }

    private List<Map<String, Object>> parseItems(List<Map<String, Object>> items) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> item : items) {
            Map<String, Object> news = new HashMap<>();
            String rawTitle = (String) item.get("title");
            String cleanTitle = rawTitle != null ? rawTitle.replaceAll("<[^>]*>", "").replaceAll("&quot;", "\"").replaceAll("&amp;", "&") : "";
            
            String rawDesc = (String) item.get("description");
            String cleanDesc = rawDesc != null ? rawDesc.replaceAll("<[^>]*>", "").replaceAll("&quot;", "\"").replaceAll("&amp;", "&") : "";

            news.put("title", cleanTitle);
            news.put("summary", cleanDesc);
            news.put("link", item.get("link"));
            news.put("pubDate", item.get("pubDate"));
            news.put("publisher", "네이버 뉴스");
            news.put("category", "최신 펫 라이프");
            news.put("imageUrl", "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=80");
            result.add(news);
        }
        return result;
    }
}

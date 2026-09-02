package com.petcare.backend.global.news;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class NaverNewsService {

    @Value("${naver.news.client-id:}")
    private String newsClientId;

    @Value("${naver.news.client-secret:}")
    private String newsClientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isConfigured() {
        return newsClientId != null && !newsClientId.isBlank();
    }

    public List<Map<String, Object>> searchPetNews(String query, int display) {
        return searchPetNews(query, 1, display);
    }

    public List<Map<String, Object>> searchPetNews(String query, int start, int display) {
        if (!isConfigured()) {
            return Collections.emptyList();
        }

        int validStart = Math.max(1, Math.min(start, 1000));
        int validDisplay = Math.max(1, Math.min(display, 100));

        // Official Naver Developers News Search API
        try {
            // RestTemplate에 String URL을 넘기면 이미 인코딩된 문자열을 한 번 더 인코딩한다
            // (% -> %25). 그러면 네이버가 한글 대신 깨진 문자열을 검색해 엉뚱한 결과를 준다.
            // URI 객체로 넘겨야 재인코딩되지 않는다.
            URI uri = UriComponentsBuilder
                    .fromUriString("https://openapi.naver.com/v1/search/news.json")
                    .queryParam("query", query)
                    .queryParam("start", validStart)
                    .queryParam("display", validDisplay)
                    // sort=date(최신순)는 검색어와 무관한 기사가 섞인다.
                    // 예: "반려동물 사료" -> 농식품부 예산 기사.
                    // sim(정확도순)이 검색 기능에는 더 적합하다.
                    .queryParam("sort", "sim")
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", newsClientId.trim());
            headers.set("X-Naver-Client-Secret", newsClientSecret.trim());

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody().get("items");
                if (items != null && !items.isEmpty()) {
                    return parseItems(items, validStart);
                }
            }
        } catch (Exception e) {
            System.err.println("Naver Developers News Search Error: " + e.getMessage());
        }

        return Collections.emptyList();
    }

    private List<Map<String, Object>> parseItems(List<Map<String, Object>> items, int start) {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] thumbnails = {
            "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80"
        };

        int idx = 0;
        for (Map<String, Object> item : items) {
            Map<String, Object> news = new HashMap<>();
            String rawTitle = (String) item.get("title");
            String cleanTitle = cleanHtml(rawTitle);
            
            String rawDesc = (String) item.get("description");
            String cleanDesc = cleanHtml(rawDesc);

            String pubDate = (String) item.get("pubDate");
            String formattedDate = pubDate;
            try {
                if (pubDate != null && pubDate.length() > 16) {
                    formattedDate = pubDate.substring(5, 16);
                }
            } catch (Exception ignored) {}

            news.put("id", start + idx);
            news.put("title", cleanTitle);
            news.put("description", cleanDesc);
            news.put("url", item.get("link"));
            news.put("publishedDate", formattedDate);
            news.put("source", "네이버 실시간 뉴스");
            news.put("category", idx % 3 == 0 ? "HEALTH" : idx % 3 == 1 ? "NUTRITION" : "POLICY");
            news.put("categoryLabel", idx % 3 == 0 ? "의학/건강" : idx % 3 == 1 ? "영양/사료" : "정책/라이프");
            news.put("image", thumbnails[(start + idx) % thumbnails.length]);
            news.put("views", 1200 + ((start + idx) * 140));
            result.add(news);
            idx++;
        }
        return result;
    }

    private String cleanHtml(String input) {
        if (input == null || input.isBlank()) return "";
        return input.replaceAll("<[^>]*>", "")
                .replaceAll("&quot;", "\"")
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&apos;", "'");
    }
}

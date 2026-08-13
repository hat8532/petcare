package com.petcare.backend.domain.news;

import com.petcare.backend.global.news.NaverNewsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/news")
@CrossOrigin(origins = "*")
public class NewsController {

    private final NewsMapper newsMapper;
    private final NaverNewsService naverNewsService;

    public NewsController(NewsMapper newsMapper, NaverNewsService naverNewsService) {
        this.newsMapper = newsMapper;
        this.naverNewsService = naverNewsService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNewsList(
            @RequestParam(defaultValue = "반려동물") String query,
            @RequestParam(defaultValue = "1") int start,
            @RequestParam(defaultValue = "10") int display
    ) {
        Map<String, Object> response = new HashMap<>();

        // 1. Try Live Naver Search News API First if credentials exist
        if (naverNewsService.isConfigured()) {
            List<Map<String, Object>> liveNews = naverNewsService.searchPetNews(query, start, display);
            if (liveNews != null && !liveNews.isEmpty()) {
                response.put("status", "SUCCESS");
                response.put("source", "NAVER_SEARCH_API");
                response.put("start", start);
                response.put("display", display);
                response.put("count", liveNews.size());
                response.put("data", liveNews);
                return ResponseEntity.ok(response);
            }
        }

        // 2. Fallback to Database / Seeded News
        List<NewsDTO> dbNews = newsMapper.findAll();
        response.put("status", "SUCCESS");
        response.put("source", "DATABASE");
        response.put("count", dbNews.size());
        response.put("data", dbNews);

        return ResponseEntity.ok(response);
    }
}

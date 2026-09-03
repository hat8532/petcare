package com.petcare.backend.domain.news;

import com.petcare.backend.global.news.NaverNewsService;
import com.petcare.backend.global.news.NewsCacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/news")
@CrossOrigin(origins = "*")
public class NewsController {

    private final NewsMapper newsMapper;
    private final NaverNewsService naverNewsService;
    private final NewsCacheService newsCacheService;

    public NewsController(NewsMapper newsMapper,
                          NaverNewsService naverNewsService,
                          NewsCacheService newsCacheService) {
        this.newsMapper = newsMapper;
        this.naverNewsService = naverNewsService;
        this.newsCacheService = newsCacheService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNewsList(
            @RequestParam(defaultValue = "반려동물") String query,
            @RequestParam(defaultValue = "1") int start,
            @RequestParam(defaultValue = "10") int display
    ) {
        Map<String, Object> response = new HashMap<>();

        // 1. 기본 목록은 6시간마다 미리 받아 둔 캐시로 답한다.
        //
        //    검색어를 직접 입력했거나(query 가 기본값이 아님)
        //    두 번째 페이지 이후(start > 1)는 캐시로 답할 수 없다.
        //    검색은 방금 친 단어의 결과여야 하고, 캐시는 첫 페이지만 갖고 있다.
        if (isDefaultFeed(query, start) && newsCacheService.hasCache()) {
            List<Map<String, Object>> cached = newsCacheService.getCachedNews(display);
            LocalDateTime refreshedAt = newsCacheService.getRefreshedAt();

            response.put("status", "SUCCESS");
            response.put("source", "NAVER_SEARCH_API_CACHED");
            // 화면이 "언제 기준 뉴스인지" 표시할 수 있도록 갱신 시각을 함께 준다.
            response.put("cachedAt", refreshedAt);
            response.put("start", start);
            response.put("display", display);
            response.put("count", cached.size());
            response.put("data", cached);
            return ResponseEntity.ok(response);
        }

        // 2. 캐시로 답할 수 없으면 네이버에 직접 물어본다.
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

        // 3. 그것도 안 되면 DB에 저장된 뉴스로 답한다.
        List<NewsDTO> dbNews = newsMapper.findAll();
        response.put("status", "SUCCESS");
        response.put("source", "DATABASE");
        response.put("count", dbNews.size());
        response.put("data", dbNews);

        return ResponseEntity.ok(response);
    }

    private boolean isDefaultFeed(String query, int start) {
        return NewsCacheService.DEFAULT_QUERY.equals(query) && start <= 1;
    }
}

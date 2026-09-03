package com.petcare.backend.global.news;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

// 기본 뉴스 목록을 6시간마다 미리 받아 두는 보관소.
//
// 캐싱하는 이유:
//  - 네이버 검색 API 는 하루 25,000회 제한이 있다. 화면을 열 때마다 호출하면
//    사람이 몰리는 순간 한도를 넘겨 아무에게도 뉴스가 안 나온다.
//  - 뉴스는 초 단위로 바뀌지 않는다. 6시간이면 충분히 새롭다.
//  - 네이버가 느리거나 잠깐 죽어도 화면은 직전 결과를 그대로 보여준다.
//
// 사용자가 검색어를 직접 입력한 경우는 캐시를 쓰지 않는다.
// 검색은 방금 친 단어에 대한 결과여야 한다.
@Service
public class NewsCacheService {

    private static final Logger log = LoggerFactory.getLogger(NewsCacheService.class);

    // 화면이 아무 검색어 없이 들어왔을 때 쓰는 기본 검색어. NewsController 와 맞춘다.
    public static final String DEFAULT_QUERY = "반려동물";

    // 6시간. 상수로 두지 않고 계산식으로 적어야 "21600000"이 무슨 숫자인지 읽힌다.
    private static final long REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000L;

    // 한 번에 받아 두는 기사 수. 화면 기본이 10건이라 여유를 조금 둔다.
    private static final int CACHE_SIZE = 20;

    private final NaverNewsService naverNewsService;

    // 갱신은 스케줄러 스레드가, 읽기는 요청 스레드가 한다.
    // volatile 을 붙여야 갱신한 값이 다른 스레드에 바로 보인다.
    private volatile List<Map<String, Object>> cachedNews = Collections.emptyList();
    private volatile LocalDateTime refreshedAt;

    public NewsCacheService(NaverNewsService naverNewsService) {
        this.naverNewsService = naverNewsService;
    }

    // initialDelay = 0 이라 서버가 뜨자마자 한 번 받아 둔다.
    // 그래야 첫 방문자도 캐시된 결과를 본다.
    @Scheduled(initialDelay = 0, fixedRate = REFRESH_INTERVAL_MS)
    public void refresh() {
        if (!naverNewsService.isConfigured()) {
            log.info("네이버 뉴스 키가 없어 캐시 갱신을 건너뜁니다.");
            return;
        }

        try {
            List<Map<String, Object>> fetched =
                    naverNewsService.searchPetNews(DEFAULT_QUERY, 1, CACHE_SIZE);

            // 빈 결과로 덮어쓰면 잘 쓰던 캐시가 사라진다.
            // 이럴 때는 직전 결과를 그대로 두는 편이 낫다.
            if (fetched == null || fetched.isEmpty()) {
                log.warn("네이버 뉴스 응답이 비어 있어 기존 캐시를 유지합니다.");
                return;
            }

            cachedNews = List.copyOf(fetched);
            refreshedAt = LocalDateTime.now();
            log.info("뉴스 캐시 갱신 완료: {}건", cachedNews.size());

        } catch (Exception e) {
            // 스케줄러 안에서 예외가 밖으로 나가면 다음 실행이 멈출 수 있다.
            // 여기서 잡고 로그만 남긴 뒤 다음 주기를 기다린다.
            log.warn("뉴스 캐시 갱신 실패. 기존 캐시를 유지합니다: {}", e.toString());
        }
    }

    public boolean hasCache() {
        return !cachedNews.isEmpty();
    }

    // 화면이 요청한 개수만큼 잘라서 준다. 가진 것보다 많이 달라고 하면 가진 만큼만.
    public List<Map<String, Object>> getCachedNews(int display) {
        List<Map<String, Object>> snapshot = cachedNews;
        if (display <= 0 || display >= snapshot.size()) return snapshot;
        return snapshot.subList(0, display);
    }

    public LocalDateTime getRefreshedAt() {
        return refreshedAt;
    }
}

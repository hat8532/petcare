package com.petcare.backend.global.hospital;

import com.petcare.backend.domain.hospital.HospitalDTO;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 네이버 지역검색 API로 실제 존재하는 동물병원을 조회한다.
 *
 * 기존에는 DataInitializer의 seed 병원과 프런트에서 생성한 병원을 표시했는데,
 * 네이버 지역검색으로 확인해보니 실존하지 않거나 주소가 다른 곳이 섞여 있었다.
 * 응급 상황에 쓰이는 정보라 검증된 출처만 사용한다.
 */
@Service
public class NaverLocalSearchService {

    // 뉴스 검색과 동일한 네이버 Developers 자격증명을 사용한다 (검색 API 공통).
    @Value("${naver.news.client-id:}")
    private String clientId;

    @Value("${naver.news.client-secret:}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank();
    }

    /**
     * 지역명 기준으로 24시 동물병원을 조회한다.
     *
     * @param regionKeyword "구로구" 처럼 검색에 쓸 지역 표현
     * @param display       가져올 개수 (네이버 지역검색 상한이 5)
     */
    public List<HospitalDTO> searchEmergencyVetHospitals(String regionKeyword, int display) {
        if (!isConfigured()) {
            return Collections.emptyList();
        }

        String region = normalizeRegion(regionKeyword);
        String query = region.isBlank() ? "24시 동물병원" : region + " 24시 동물병원";

        // 네이버 지역검색은 display 상한이 5다. 그 이상을 요청하면 400이 난다.
        int validDisplay = Math.max(1, Math.min(display, 5));

        try {
            // RestTemplate에 String URL을 넘기면 인코딩이 두 번 적용되므로 URI 객체로 전달한다.
            URI uri = UriComponentsBuilder
                    .fromUriString("https://openapi.naver.com/v1/search/local.json")
                    .queryParam("query", query)
                    .queryParam("display", validDisplay)
                    .queryParam("sort", "random")
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", clientId.trim());
            headers.set("X-Naver-Client-Secret", clientSecret.trim());

            ResponseEntity<Map> response =
                    restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> items =
                        (List<Map<String, Object>>) response.getBody().get("items");
                if (items != null) {
                    return toHospitals(items);
                }
            }
        } catch (Exception e) {
            System.err.println("Naver Local Search Error: " + e.getMessage());
        }

        return Collections.emptyList();
    }

    /**
     * 프런트는 화면 표시용으로 "구로·가산", "강남·역삼" 같은 이름을 보낸다.
     * 이 형태를 그대로 검색하면 네이버가 결과를 찾지 못해 0건이 나온다.
     * 가운뎃점 앞의 대표 지역명만 남겨 검색어로 쓴다.
     */
    private String normalizeRegion(String regionKeyword) {
        if (regionKeyword == null) return "";

        String region = regionKeyword.trim();
        if (region.isEmpty()) return "";

        // "구로·가산" -> "구로" (가운뎃점, 중점, 슬래시, 쉼표 모두 처리)
        String[] parts = region.split("[·ㆍ/,]");
        return parts.length > 0 ? parts[0].trim() : region;
    }

    private List<HospitalDTO> toHospitals(List<Map<String, Object>> items) {
        List<HospitalDTO> result = new ArrayList<>();

        for (Map<String, Object> item : items) {
            String name = stripHtml(asText(item.get("title")));
            if (name.isBlank()) continue;

            String roadAddress = asText(item.get("roadAddress"));
            String address = roadAddress.isBlank() ? asText(item.get("address")) : roadAddress;

            // 네이버 지역검색 좌표는 WGS84를 10^7배한 정수로 내려온다.
            Double lng = parseCoordinate(item.get("mapx"));
            Double lat = parseCoordinate(item.get("mapy"));
            if (lat == null || lng == null) continue;

            String telephone = asText(item.get("telephone"));

            result.add(HospitalDTO.builder()
                    .name(name)
                    .address(address)
                    // 지역검색은 전화번호를 거의 내려주지 않는다.
                    // 없는 값을 지어내지 않고 비워 둔다.
                    .phone(telephone.isBlank() ? null : telephone)
                    .latitude(lat)
                    .longitude(lng)
                    // "24시 동물병원"으로 검색했지만 실제 24시 운영 여부는 확인할 수 없다.
                    // 단정하지 않고 null로 둔다.
                    .isEmergency24h(null)
                    .businessHours(null)
                    .naverPlaceUrl(buildPlaceSearchUrl(name))
                    .isActive(true)
                    .build());
        }

        return result;
    }

    private String buildPlaceSearchUrl(String name) {
        return "https://map.naver.com/p/search/"
                + java.net.URLEncoder.encode(name, StandardCharsets.UTF_8);
    }

    private Double parseCoordinate(Object raw) {
        String text = asText(raw);
        if (text.isBlank()) return null;
        try {
            return Double.parseDouble(text) / 10_000_000.0;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String asText(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    // 네이버 응답은 <b> 같은 태그와 &amp; 같은 HTML 엔티티를 함께 담아 보낸다.
    // 태그만 지우면 "힐링동물병원 &amp; 건강검진센터"처럼 엔티티가 화면에 그대로 노출된다.
    private String stripHtml(String input) {
        String text = input.replaceAll("<[^>]*>", "");
        // &amp;를 마지막에 풀어야 "&amp;lt;" 같은 이중 인코딩이 &lt;로 잘못 복원되지 않는다.
        text = text.replace("&lt;", "<")
                   .replace("&gt;", ">")
                   .replace("&quot;", "\"")
                   .replace("&#39;", "'")
                   .replace("&nbsp;", " ")
                   .replace("&amp;", "&");
        return text.trim();
    }
}

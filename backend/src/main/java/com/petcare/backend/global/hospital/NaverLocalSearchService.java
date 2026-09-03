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
                    // 업체가 스스로 상호에 "24시"를 넣었는지로 판단한다.
                    // 지역검색은 영업시간을 내려주지 않아 이것 말고는 근거가 없다.
                    // null로 두면 화면의 24시 필터가 전부 걸러내 0건이 된다.
                    .isEmergency24h(looksLike24Hours(name))
                    // 실제 영업시간은 확인할 수 없다. 지어내지 않고 비워 둔다.
                    .businessHours(null)
                    .naverPlaceUrl(buildPlaceSearchUrl(name))
                    .isActive(true)
                    .build());
        }

        return result;
    }

    // 상호에 24시간 운영을 뜻하는 표기가 있는지 본다.
    //
    // 근거가 상호뿐이라 정확하지는 않다. 상호에 안 적고 24시로 운영하는 곳도 있고,
    // 상호만 그대로 두고 야간 진료를 접은 곳도 있다.
    // 다만 값을 비워 두면 필터가 통째로 동작하지 않으므로, 확인 가능한 근거로 채운다.
    //
    // 공백을 지우고 보는 이유: "24시 동물병원"과 "24시동물병원"이 섞여 들어온다.
    private Boolean looksLike24Hours(String name) {
        if (name == null || name.isBlank()) return false;

        String compact = name.replaceAll("\\s+", "").toUpperCase();
        return compact.contains("24시")
                || compact.contains("24H")
                || compact.contains("24시간")
                || compact.contains("야간응급")
                || compact.contains("응급의료센터");
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

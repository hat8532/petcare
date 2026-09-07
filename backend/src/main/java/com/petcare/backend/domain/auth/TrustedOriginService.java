package com.petcare.backend.domain.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class TrustedOriginService {

    private final List<String> allowedOrigins;

    public TrustedOriginService(@Value("${app.cors.allowed-origins}") String configuredOrigins) {
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    public boolean isTrusted(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return allowedOrigins.contains(origin);
        }

        // Browser의 교차 Site POST는 Origin 또는 Sec-Fetch-Site를 보낸다.
        // 둘 다 없는 서버 간 요청은 피해자 Cookie를 자동 첨부할 수 없으므로 허용한다.
        String fetchSite = request.getHeader("Sec-Fetch-Site");
        return fetchSite == null || fetchSite.isBlank()
                || "same-origin".equals(fetchSite)
                || "same-site".equals(fetchSite)
                || "none".equals(fetchSite);
    }
}

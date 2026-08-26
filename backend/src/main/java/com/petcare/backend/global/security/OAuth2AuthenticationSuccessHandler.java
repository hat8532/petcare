package com.petcare.backend.global.security;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public OAuth2AuthenticationSuccessHandler(JwtUtil jwtUtil, UserMapper userMapper) {
        this.jwtUtil = jwtUtil;
        this.userMapper = userMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
        String registrationId = authToken.getAuthorizedClientRegistrationId();
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = "";

        if ("google".equals(registrationId)) {
            email = (String) attributes.get("email");
        } else if ("naver".equals(registrationId)) {
            Map<String, Object> naverResponse = (Map<String, Object>) attributes.get("response");
            if (naverResponse != null) {
                email = (String) naverResponse.get("email");
            }
        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");
            }
        }

        UserDTO user = userMapper.findByEmail(email);
        if (user == null) {
            response.sendRedirect(frontendUrl + "/login?error=user_not_found");
            return;
        }

        // 탈퇴(DELETED) 또는 정지(INACTIVE) 회원 로그인 차단
        if ("DELETED".equalsIgnoreCase(user.getStatus())) {
            response.sendRedirect(frontendUrl + "/login?error=deleted_user");
            return;
        }

        if ("INACTIVE".equalsIgnoreCase(user.getStatus()) || "BLOCKED".equalsIgnoreCase(user.getStatus())) {
            response.sendRedirect(frontendUrl + "/login?error=inactive_user");
            return;
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("id", user.getId())
                .queryParam("nickname", user.getNickname())
                .queryParam("email", user.getEmail())
                .queryParam("role", user.getRole())
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}

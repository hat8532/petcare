package com.petcare.backend.global.security;

import com.petcare.backend.domain.auth.AuthDTO;
import com.petcare.backend.domain.auth.OAuth2LoginCodeService;
import com.petcare.backend.domain.auth.OAuth2LoginCodeCookieService;
import com.petcare.backend.domain.auth.RefreshTokenService;
import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;
    private final RefreshTokenService refreshTokenService;
    private final OAuth2LoginCodeService oAuth2LoginCodeService;
    private final OAuth2LoginCodeCookieService oAuth2LoginCodeCookieService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public OAuth2AuthenticationSuccessHandler(JwtUtil jwtUtil, UserMapper userMapper,
                                              RefreshTokenService refreshTokenService,
                                              OAuth2LoginCodeService oAuth2LoginCodeService,
                                              OAuth2LoginCodeCookieService oAuth2LoginCodeCookieService) {
        this.jwtUtil = jwtUtil;
        this.userMapper = userMapper;
        this.refreshTokenService = refreshTokenService;
        this.oAuth2LoginCodeService = oAuth2LoginCodeService;
        this.oAuth2LoginCodeCookieService = oAuth2LoginCodeCookieService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        Object userIdAttribute = oAuth2User.getAttributes().get("petcareUserId");
        Long userId = userIdAttribute instanceof Number number ? number.longValue() : null;
        UserDTO user = userId == null ? null : userMapper.findById(userId);
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
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());
        refreshTokenService.store(user.getId(), refreshToken);

        AuthDTO.AuthResponse authResponse = AuthDTO.AuthResponse.builder()
                .status("SUCCESS")
                .message("소셜 로그인에 성공하였습니다.")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(AuthDTO.UserSummary.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .nickname(user.getNickname())
                        .role(user.getRole())
                        .profileImageUrl(user.getProfileImageUrl())
                        .build())
                .build();
        String loginCode = oAuth2LoginCodeService.issue(authResponse);
        oAuth2LoginCodeCookieService.write(response, loginCode);

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                .queryParam("code", loginCode)
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUriString();

        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Pragma", "no-cache");
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}

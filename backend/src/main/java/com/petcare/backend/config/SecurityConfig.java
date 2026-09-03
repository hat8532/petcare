package com.petcare.backend.config;

import com.petcare.backend.global.security.CustomOAuth2UserService;
import com.petcare.backend.global.security.JwtAuthenticationFilter;
import com.petcare.backend.global.security.OAuth2AuthenticationSuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CustomOAuth2UserService customOAuth2UserService,
                          OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler,
                          JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2AuthenticationSuccessHandler = oAuth2AuthenticationSuccessHandler;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable)) // H2 Console
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"status\":\"FAIL\",\"message\":\"인증이 필요합니다.\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"status\":\"FAIL\",\"message\":\"접근 권한이 없습니다.\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Preflight CORS 요청 허용
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // 인증/로그인/소셜/공통 공개 엔드포인트
                .requestMatchers("/api/v1/auth/**", "/oauth2/**", "/login/**", "/error", "/h2-console/**").permitAll()
                // 공개 조회 API 허용
                .requestMatchers(HttpMethod.GET, "/api/v1/hospitals/**", "/api/v1/news/**", "/api/v1/community/**", "/api/v1/timelines/**").permitAll()
                // 커뮤니티 글 작성은 로그인한 사용자만 허용
                .requestMatchers(HttpMethod.POST, "/api/v1/community", "/api/v1/community/**").authenticated()
                // 글 수정·삭제도 로그인 필수. 규칙이 없으면 아래 anyRequest().permitAll()로
                // 떨어져 인증 없이 Controller까지 도달한다.
                .requestMatchers(HttpMethod.PUT, "/api/v1/community/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/community/**").authenticated()
                // 병원 북마크 등록/해제는 로그인 필수.
                // 조회(GET /api/v1/hospitals/bookmarks)는 위 permitAll 규칙에 걸리므로
                // Controller에서 직접 401로 끊는다.
                .requestMatchers(HttpMethod.POST, "/api/v1/hospitals/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/diagnosis/symptoms").permitAll()
                .requestMatchers("/api/v1/diagnosis/**").authenticated()
                .requestMatchers("/api/v1/chat/**").permitAll()
                // 반려동물 관련 API, 주소록 API 및 회원 마이페이지 API는 인증된 사용자만 접근 가능 (보호된 API)
                .requestMatchers("/api/v1/pets/**").authenticated()
                .requestMatchers("/api/v1/addresses/**").authenticated()
                .requestMatchers("/api/v1/users/**").authenticated()
                // 그 외 모든 요청은 기본 허용
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                .successHandler(oAuth2AuthenticationSuccessHandler)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

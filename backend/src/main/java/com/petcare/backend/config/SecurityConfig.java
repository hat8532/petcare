package com.petcare.backend.config;

import com.petcare.backend.global.security.CustomOAuth2UserService;
import com.petcare.backend.global.security.AuthenticationRateLimitFilter;
import com.petcare.backend.global.security.JwtAuthenticationFilter;
import com.petcare.backend.global.security.OAuth2AuthenticationSuccessHandler;
import com.petcare.backend.global.security.RequestRateLimiter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
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
    private final RequestRateLimiter requestRateLimiter;
    private final List<String> allowedOrigins;

    public SecurityConfig(CustomOAuth2UserService customOAuth2UserService,
                          OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler,
                          JwtAuthenticationFilter jwtAuthenticationFilter,
                          RequestRateLimiter requestRateLimiter,
                          @Value("${app.cors.allowed-origins}") String configuredOrigins) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2AuthenticationSuccessHandler = oAuth2AuthenticationSuccessHandler;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.requestRateLimiter = requestRateLimiter;
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"code\":401,\"message\":\"인증이 필요합니다.\",\"data\":null}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"code\":403,\"message\":\"접근 권한이 없습니다.\",\"data\":null}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Preflight CORS 요청 허용
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // 로그인 전에도 필요한 인증/소셜 엔드포인트만 공개한다.
                .requestMatchers("/api/v1/auth/signup", "/api/v1/auth/login", "/api/v1/auth/refresh",
                        "/api/v1/auth/oauth2/exchange", "/api/v1/auth/logout",
                        "/api/v1/auth/check-email", "/api/v1/auth/check-nickname",
                        "/api/v1/auth/forgot-password", "/oauth2/**", "/login/**", "/error").permitAll()
                .requestMatchers("/api/v1/auth/withdraw").authenticated()
                // 사용자 전용 GET은 넓은 공개 조회 규칙보다 먼저 둔다.
                .requestMatchers(HttpMethod.GET, "/api/v1/hospitals/bookmarks",
                        "/api/v1/community/my-reports", "/api/v1/timelines/**").authenticated()
                // 병원·뉴스·커뮤니티의 일반 조회는 공개 기능으로 유지한다.
                .requestMatchers(HttpMethod.GET, "/api/v1/hospitals/**", "/api/v1/news/**",
                        "/api/v1/community/**").permitAll()
                // 커뮤니티 글 작성은 로그인한 사용자만 허용
                .requestMatchers(HttpMethod.POST, "/api/v1/community", "/api/v1/community/**").authenticated()
                // 글 수정·삭제도 로그인 필수다.
                .requestMatchers(HttpMethod.PUT, "/api/v1/community/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/community/**").authenticated()
                // 병원 북마크 등록/해제는 로그인 필수다.
                .requestMatchers(HttpMethod.POST, "/api/v1/hospitals/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/diagnosis/symptoms").permitAll()
                .requestMatchers("/api/v1/diagnosis/**").authenticated()
                .requestMatchers("/api/v1/chat/**").authenticated()
                // 반려동물 관련 API, 주소록 API 및 회원 마이페이지 API는 인증된 사용자만 접근 가능 (보호된 API)
                .requestMatchers("/api/v1/pets/**").authenticated()
                .requestMatchers("/api/v1/addresses/**").authenticated()
                .requestMatchers("/api/v1/users/**").authenticated()
                // 새 엔드포인트가 실수로 공개되지 않도록 기본값을 인증 필수로 둔다.
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                .successHandler(oAuth2AuthenticationSuccessHandler)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new AuthenticationRateLimitFilter(requestRateLimiter),
                    JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        // Refresh Token HttpOnly Cookie를 정확한 Origin에서만 보내기 위해 credentials를 허용한다.
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

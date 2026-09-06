package com.petcare.backend.domain.auth;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import com.petcare.backend.global.security.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final OAuth2LoginCodeService oAuth2LoginCodeService;
    private final OAuth2LoginCodeCookieService oAuth2LoginCodeCookieService;
    private final RefreshTokenCookieService refreshTokenCookieService;
    private final TrustedOriginService trustedOriginService;

    public AuthController(UserMapper userMapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                          RefreshTokenService refreshTokenService,
                          OAuth2LoginCodeService oAuth2LoginCodeService,
                          OAuth2LoginCodeCookieService oAuth2LoginCodeCookieService,
                          RefreshTokenCookieService refreshTokenCookieService,
                          TrustedOriginService trustedOriginService) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.oAuth2LoginCodeService = oAuth2LoginCodeService;
        this.oAuth2LoginCodeCookieService = oAuth2LoginCodeCookieService;
        this.refreshTokenCookieService = refreshTokenCookieService;
        this.trustedOriginService = trustedOriginService;
    }

    /**
     * ① 이메일 회원가입 API (Validation 적용)
     * POST /api/v1/auth/signup
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody AuthDTO.SignupRequest request,
                                    BindingResult bindingResult,
                                    HttpServletResponse servletResponse) {
        if (bindingResult.hasErrors()) {
            String firstError = bindingResult.getAllErrors().get(0).getDefaultMessage();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", firstError);
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String email = request.getEmail().trim();

        // 1. 이메일 중복 체크
        if (userMapper.countByEmail(email) > 0) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "이미 사용 중인 이메일 주소입니다.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        }

        // 2. 닉네임 중복 및 기본값 처리
        String nickname = request.getNickname();
        if (nickname == null || nickname.trim().isEmpty()) {
            nickname = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        } else {
            nickname = nickname.trim();
            if (userMapper.countByNickname(nickname) > 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "FAIL");
                errorResponse.put("message", "이미 사용 중인 닉네임입니다.");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
            }
        }

        // 3. 비밀번호 BCrypt 암호화
        String encodedPassword = passwordEncoder.encode(request.getPassword().trim());

        // 4. DB 사용자 저장
        UserDTO user = UserDTO.builder()
                .email(email)
                .password(encodedPassword)
                .nickname(nickname)
                .phone(request.getPhone())
                .provider("LOCAL")
                .role("ROLE_USER")
                .status("ACTIVE")
                .build();

        userMapper.insert(user);

        // 5. 회원가입 완료 후 토큰 발급
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());
        refreshTokenService.store(user.getId(), refreshToken);
        refreshTokenCookieService.write(servletResponse, refreshToken);

        AuthDTO.UserSummary userSummary = AuthDTO.UserSummary.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole())
                .profileImageUrl(user.getProfileImageUrl())
                .build();

        AuthDTO.AuthResponse response = AuthDTO.AuthResponse.builder()
                .status("SUCCESS")
                .message("회원가입이 완료되었습니다.")
                .accessToken(accessToken)
                .refreshToken(null)
                .tokenType("Bearer")
                .user(userSummary)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * ① 이메일 로그인 API
     * POST /api/v1/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDTO.LoginRequest request,
                                   BindingResult bindingResult,
                                   HttpServletResponse servletResponse) {
        if (bindingResult.hasErrors()) {
            String firstError = bindingResult.getAllErrors().get(0).getDefaultMessage();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", firstError);
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String email = request.getEmail().trim();

        // 1. DB에서 이메일로 사용자 조회
        UserDTO user = userMapper.findByEmail(email);

        // 2. 사용자 존재 여부 및 비밀번호 검증 (BCrypt matches)
        if (user == null || !passwordEncoder.matches(request.getPassword().trim(), user.getPassword())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "이메일 또는 비밀번호가 일치하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 3. 계정 활성화 상태 확인 (탈퇴 회원 Soft Delete 검증 포함)
        if ("DELETED".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "탈퇴 처리된 계정입니다. 고객센터에 문의해주세요.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }

        if ("INACTIVE".equalsIgnoreCase(user.getStatus()) || "BLOCKED".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "비활성화되었거나 정지된 계정입니다.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }

        // 4. JWT Access / Refresh Token 발급
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());
        refreshTokenService.store(user.getId(), refreshToken);
        refreshTokenCookieService.write(servletResponse, refreshToken);

        AuthDTO.UserSummary userSummary = AuthDTO.UserSummary.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole())
                .profileImageUrl(user.getProfileImageUrl())
                .build();

        AuthDTO.AuthResponse response = AuthDTO.AuthResponse.builder()
                .status("SUCCESS")
                .message("로그인에 성공하였습니다.")
                .accessToken(accessToken)
                .refreshToken(null)
                .tokenType("Bearer")
                .user(userSummary)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * ④ Refresh Token 자동 갱신 API (Silent Refresh)
     * POST /api/v1/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAccessToken(
            @CookieValue(name = RefreshTokenCookieService.COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        if (!trustedOriginService.isTrusted(servletRequest)) {
            return forbiddenOrigin();
        }

        // 1. Refresh Token 유효성 검증
        if (refreshToken == null || !jwtUtil.validateRefreshToken(refreshToken)) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "만료되었거나 유효하지 않은 Refresh Token입니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 2. 토큰에서 이메일 추출 및 사용자 조회
        Claims claims = jwtUtil.getClaimsFromToken(refreshToken);
        String email = claims.getSubject();
        Object userIdClaim = claims.get("userId");
        Long tokenUserId = userIdClaim instanceof Number number ? number.longValue() : null;
        UserDTO user = userMapper.findByEmail(email);

        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())
                || tokenUserId == null || !tokenUserId.equals(user.getId())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "존재하지 않거나 비활성화된 사용자입니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 3. 새 Access Token 발급
        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());
        if (!refreshTokenService.rotate(user.getId(), refreshToken, newRefreshToken)) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "이미 사용되었거나 폐기된 Refresh Token입니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        refreshTokenCookieService.write(servletResponse, newRefreshToken);

        AuthDTO.UserSummary userSummary = AuthDTO.UserSummary.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole())
                .profileImageUrl(user.getProfileImageUrl())
                .build();

        AuthDTO.AuthResponse response = AuthDTO.AuthResponse.builder()
                .status("SUCCESS")
                .message("토큰이 성공적으로 재발급되었습니다.")
                .accessToken(newAccessToken)
                .refreshToken(null)
                .tokenType("Bearer")
                .user(userSummary)
                .build();

        return ResponseEntity.ok(response);
    }

    /** OAuth Redirect에서 받은 1회용 Code를 JWT 로그인 응답으로 교환한다. */
    @PostMapping("/oauth2/exchange")
    public ResponseEntity<?> exchangeOAuthCode(
            @Valid @RequestBody AuthDTO.OAuthCodeExchangeRequest request,
            BindingResult bindingResult,
            @CookieValue(name = OAuth2LoginCodeCookieService.COOKIE_NAME, required = false)
            String browserBindingCode,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        if (!trustedOriginService.isTrusted(servletRequest)) {
            return forbiddenOrigin();
        }
        if (bindingResult.hasErrors()) {
            oAuth2LoginCodeCookieService.clear(servletResponse);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "OAuth Login Code가 필요합니다.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        if (!oAuth2LoginCodeCookieService.matches(browserBindingCode, request.getCode())) {
            oAuth2LoginCodeCookieService.clear(servletResponse);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "OAuth Login Code가 이 브라우저에서 발급되지 않았습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        AuthDTO.AuthResponse authResponse = oAuth2LoginCodeService.consume(request.getCode()).orElse(null);
        oAuth2LoginCodeCookieService.clear(servletResponse);
        if (authResponse == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "만료되었거나 이미 사용된 OAuth Login Code입니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        refreshTokenCookieService.write(servletResponse, authResponse.getRefreshToken());
        authResponse.setRefreshToken(null);
        return ResponseEntity.ok(authResponse);
    }

    /**
     * ⑤ 이메일 중복 확인 API
     * GET /api/v1/auth/check-email?email=...
     */
    @GetMapping("/check-email")
    public ResponseEntity<AuthDTO.AvailabilityResponse> checkEmail(@RequestParam("email") String email) {
        if (email == null || email.trim().isEmpty() || email.length() > 100 || !email.contains("@")) {
            return ResponseEntity.ok(AuthDTO.AvailabilityResponse.builder()
                    .available(false)
                    .message("올바른 이메일 형식을 입력해주세요.")
                    .build());
        }

        int count = userMapper.countByEmail(email.trim());
        boolean isAvailable = (count == 0);
        return ResponseEntity.ok(AuthDTO.AvailabilityResponse.builder()
                .available(isAvailable)
                .message(isAvailable ? "사용 가능한 이메일입니다." : "이미 등록된 이메일 주소입니다.")
                .build());
    }

    /**
     * ⑤ 닉네임 중복 확인 API
     * GET /api/v1/auth/check-nickname?nickname=...
     */
    @GetMapping("/check-nickname")
    public ResponseEntity<AuthDTO.AvailabilityResponse> checkNickname(@RequestParam("nickname") String nickname) {
        if (nickname == null || nickname.trim().isEmpty() || nickname.length() > 50) {
            return ResponseEntity.ok(AuthDTO.AvailabilityResponse.builder()
                    .available(false)
                    .message("닉네임을 입력해주세요.")
                    .build());
        }

        int count = userMapper.countByNickname(nickname.trim());
        boolean isAvailable = (count == 0);
        return ResponseEntity.ok(AuthDTO.AvailabilityResponse.builder()
                .available(isAvailable)
                .message(isAvailable ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다.")
                .build());
    }

    /**
     * ⑦ 로그아웃 API
     * POST /api/v1/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = RefreshTokenCookieService.COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        if (!trustedOriginService.isTrusted(servletRequest)) {
            return forbiddenOrigin();
        }

        refreshTokenService.revoke(refreshToken);
        refreshTokenCookieService.clear(servletResponse);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "로그아웃되었습니다.");
        return ResponseEntity.ok(response);
    }

    /**
     * ⑦ 회원 탈퇴 API (Soft Delete: status = 'DELETED')
     * POST /api/v1/auth/withdraw
     */
    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(HttpServletResponse servletResponse) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        String email = auth.getName();
        UserDTO user = userMapper.findByEmail(email);
        if (user == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "사용자 정보를 찾을 수 없습니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }

        // Soft Delete 적용
        refreshTokenService.revokeAll(user.getId());
        refreshTokenCookieService.clear(servletResponse);
        userMapper.updateStatus(user.getId(), "DELETED");

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
        return ResponseEntity.ok(response);
    }

    /**
     * ⑧ 비밀번호 찾기 / 재설정
     * POST /api/v1/auth/forgot-password
     *
     * 이메일 소유권을 검증하는 일회용 토큰 흐름이 준비되기 전까지
     * 계정 비밀번호를 변경하지 않고 안전하게 중단한다.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody AuthDTO.ForgotPasswordRequest request, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "올바른 이메일 주소를 입력해주세요.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAIL");
        response.put("message", "비밀번호 재설정 기능은 이메일 본인 확인 도입 전까지 일시 중단되었습니다.");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }

    private ResponseEntity<Map<String, Object>> forbiddenOrigin() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAIL");
        response.put("message", "허용되지 않은 요청 출처입니다.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }
}

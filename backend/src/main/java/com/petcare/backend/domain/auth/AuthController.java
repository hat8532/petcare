package com.petcare.backend.domain.auth;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import com.petcare.backend.global.security.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserMapper userMapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * ① 이메일 회원가입 API (Validation 적용)
     * POST /api/v1/auth/signup
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody AuthDTO.SignupRequest request, BindingResult bindingResult) {
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
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

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
                .refreshToken(refreshToken)
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
    public ResponseEntity<?> login(@Valid @RequestBody AuthDTO.LoginRequest request, BindingResult bindingResult) {
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
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

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
                .refreshToken(refreshToken)
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
    public ResponseEntity<?> refreshAccessToken(@Valid @RequestBody AuthDTO.RefreshTokenRequest request, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "Refresh Token이 제공되지 않았습니다.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String refreshToken = request.getRefreshToken();

        // 1. Refresh Token 유효성 검증
        if (!jwtUtil.validateToken(refreshToken)) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "만료되었거나 유효하지 않은 Refresh Token입니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 2. 토큰에서 이메일 추출 및 사용자 조회
        Claims claims = jwtUtil.getClaimsFromToken(refreshToken);
        String email = claims.getSubject();
        UserDTO user = userMapper.findByEmail(email);

        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "존재하지 않거나 비활성화된 사용자입니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 3. 새 Access Token 발급
        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getEmail());

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
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .user(userSummary)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * ⑤ 이메일 중복 확인 API
     * GET /api/v1/auth/check-email?email=...
     */
    @GetMapping("/check-email")
    public ResponseEntity<AuthDTO.AvailabilityResponse> checkEmail(@RequestParam("email") String email) {
        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
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
        if (nickname == null || nickname.trim().isEmpty()) {
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
    public ResponseEntity<?> logout() {
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
    public ResponseEntity<?> withdraw() {
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
        userMapper.updateStatus(user.getId(), "DELETED");

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
        return ResponseEntity.ok(response);
    }

    /**
     * ⑧ 비밀번호 찾기 / 재설정 (임시 비밀번호 발급)
     * POST /api/v1/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody AuthDTO.ForgotPasswordRequest request, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "올바른 이메일 주소를 입력해주세요.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String email = request.getEmail().trim();
        UserDTO user = userMapper.findByEmail(email);

        if (user == null || "DELETED".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAIL");
            errorResponse.put("message", "등록되지 않았거나 탈퇴된 이메일 주소입니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }

        // 안전한 10자리 임시 비밀번호 생성 (영문 대소문자 + 숫자 + 특수문자)
        String tempPassword = generateRandomPassword(10);
        String encodedPassword = passwordEncoder.encode(tempPassword);

        userMapper.updatePassword(user.getId(), encodedPassword);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "임시 비밀번호가 안전하게 발급 및 재설정되었습니다. 등록된 이메일 또는 관리자 안내를 확인해 주세요.");
        return ResponseEntity.ok(response);
    }

    private String generateRandomPassword(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}

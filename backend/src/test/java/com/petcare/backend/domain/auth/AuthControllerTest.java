package com.petcare.backend.domain.auth;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import com.petcare.backend.global.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BeanPropertyBindingResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AuthControllerTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private final String testEmail = "testuser_auth_2026@petcare.com";
    private final String testPassword = "securePassword123!";
    private final String testNickname = "댕댕이집사";

    @Test
    @DisplayName("1. 회원가입 성공 - 비밀번호가 BCrypt로 암호화되어 저장되고 JWT 토큰이 발급되는지 검증")
    void testSignupSuccess() {
        AuthDTO.SignupRequest signupRequest = AuthDTO.SignupRequest.builder()
                .email(testEmail)
                .password(testPassword)
                .nickname(testNickname)
                .phone("010-1234-5678")
                .build();

        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(signupRequest, "signupRequest");
        ResponseEntity<?> response = authController.signup(signupRequest, bindingResult);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isInstanceOf(AuthDTO.AuthResponse.class);

        AuthDTO.AuthResponse authResponse = (AuthDTO.AuthResponse) response.getBody();
        assertThat(authResponse.getStatus()).isEqualTo("SUCCESS");
        assertThat(authResponse.getAccessToken()).isNotBlank();
        assertThat(authResponse.getRefreshToken()).isNotBlank();
        assertThat(authResponse.getUser().getEmail()).isEqualTo(testEmail);
        assertThat(authResponse.getUser().getNickname()).isEqualTo(testNickname);

        // DB에 저장된 비밀번호가 암호화되었는지 및 matches 검증
        UserDTO savedUser = userMapper.findByEmail(testEmail);
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getPassword()).isNotEqualTo(testPassword);
        assertThat(passwordEncoder.matches(testPassword, savedUser.getPassword())).isTrue();

        // JWT 토큰 검증
        assertThat(jwtUtil.validateToken(authResponse.getAccessToken())).isTrue();
        assertThat(jwtUtil.getClaimsFromToken(authResponse.getAccessToken()).getSubject()).isEqualTo(testEmail);
    }

    @Test
    @DisplayName("2. 중복 이메일 회원가입 시도 시 409 Conflict 실패 검증")
    void testSignupDuplicateEmail() {
        // 첫 번째 가입
        AuthDTO.SignupRequest firstSignup = AuthDTO.SignupRequest.builder()
                .email(testEmail)
                .password(testPassword)
                .nickname(testNickname)
                .build();
        BeanPropertyBindingResult firstBinding = new BeanPropertyBindingResult(firstSignup, "firstSignup");
        authController.signup(firstSignup, firstBinding);

        // 동일 이메일 재가입 시도
        AuthDTO.SignupRequest secondSignup = AuthDTO.SignupRequest.builder()
                .email(testEmail)
                .password("otherPassword456!")
                .nickname("다른닉네임")
                .build();
        BeanPropertyBindingResult secondBinding = new BeanPropertyBindingResult(secondSignup, "secondSignup");
        ResponseEntity<?> duplicateResponse = authController.signup(secondSignup, secondBinding);

        assertThat(duplicateResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(duplicateResponse.getBody()).isInstanceOf(Map.class);
        Map<?, ?> errorMap = (Map<?, ?>) duplicateResponse.getBody();
        assertThat(errorMap.get("status")).isEqualTo("FAIL");
        assertThat(errorMap.get("message")).isEqualTo("이미 사용 중인 이메일 주소입니다.");
    }

    @Test
    @DisplayName("3. 로그인 성공 - 비밀번호 일치 시 JWT Access/Refresh 토큰 정상 발급 검증")
    void testLoginSuccess() {
        // 사전 가입
        AuthDTO.SignupRequest signupRequest = AuthDTO.SignupRequest.builder()
                .email(testEmail)
                .password(testPassword)
                .nickname(testNickname)
                .build();
        BeanPropertyBindingResult signupBinding = new BeanPropertyBindingResult(signupRequest, "signupRequest");
        authController.signup(signupRequest, signupBinding);

        // 로그인 요청
        AuthDTO.LoginRequest loginRequest = AuthDTO.LoginRequest.builder()
                .email(testEmail)
                .password(testPassword)
                .build();
        BeanPropertyBindingResult loginBinding = new BeanPropertyBindingResult(loginRequest, "loginRequest");
        ResponseEntity<?> response = authController.login(loginRequest, loginBinding);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(AuthDTO.AuthResponse.class);

        AuthDTO.AuthResponse authResponse = (AuthDTO.AuthResponse) response.getBody();
        assertThat(authResponse.getStatus()).isEqualTo("SUCCESS");
        assertThat(authResponse.getAccessToken()).isNotBlank();
        assertThat(authResponse.getRefreshToken()).isNotBlank();
        assertThat(authResponse.getUser().getEmail()).isEqualTo(testEmail);

        // 토큰 유효성 검증
        assertThat(jwtUtil.validateToken(authResponse.getAccessToken())).isTrue();
        assertThat(jwtUtil.getClaimsFromToken(authResponse.getAccessToken()).getSubject()).isEqualTo(testEmail);
    }

    @Test
    @DisplayName("4. 로그인 실패 - 비밀번호 불일치 시 401 Unauthorized 반환 검증")
    void testLoginWrongPassword() {
        // 사전 가입
        AuthDTO.SignupRequest signupRequest = AuthDTO.SignupRequest.builder()
                .email(testEmail)
                .password(testPassword)
                .nickname(testNickname)
                .build();
        BeanPropertyBindingResult signupBinding = new BeanPropertyBindingResult(signupRequest, "signupRequest");
        authController.signup(signupRequest, signupBinding);

        // 틀린 비밀번호로 로그인 시도
        AuthDTO.LoginRequest loginRequest = AuthDTO.LoginRequest.builder()
                .email(testEmail)
                .password("wrongPassword999!")
                .build();
        BeanPropertyBindingResult loginBinding = new BeanPropertyBindingResult(loginRequest, "loginRequest");
        ResponseEntity<?> response = authController.login(loginRequest, loginBinding);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isInstanceOf(Map.class);
        Map<?, ?> errorMap = (Map<?, ?>) response.getBody();
        assertThat(errorMap.get("status")).isEqualTo("FAIL");
        assertThat(errorMap.get("message")).isEqualTo("이메일 또는 비밀번호가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("5. 로그인 실패 - 존재하지 않는 이메일 시 401 Unauthorized 반환 검증")
    void testLoginNonExistentEmail() {
        AuthDTO.LoginRequest loginRequest = AuthDTO.LoginRequest.builder()
                .email("nonexistent_user_9999@petcare.com")
                .password(testPassword)
                .build();
        BeanPropertyBindingResult loginBinding = new BeanPropertyBindingResult(loginRequest, "loginRequest");
        ResponseEntity<?> response = authController.login(loginRequest, loginBinding);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}

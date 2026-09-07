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
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BeanPropertyBindingResult;

import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AuthExtendedControllerTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RefreshTokenService refreshTokenService;

    private final String email = "extended_test_user@petcare.com";
    private final String password = "ComplexPassword123!";
    private final String nickname = "해피집사";

    @Test
    @DisplayName("④ Refresh Token 갱신 - 정상 토큰으로 새 Access Token 재발급 검증")
    void testRefreshTokenSuccess() {
        // 사용자 가입
        UserDTO user = UserDTO.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .provider("LOCAL")
                .role("ROLE_USER")
                .status("ACTIVE")
                .build();
        userMapper.insert(user);

        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), email);
        refreshTokenService.store(user.getId(), refreshToken);

        MockHttpServletResponse servletResponse = new MockHttpServletResponse();
        ResponseEntity<?> response = authController.refreshAccessToken(
                refreshToken, new MockHttpServletRequest(), servletResponse);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(AuthDTO.AuthResponse.class);

        AuthDTO.AuthResponse authResponse = (AuthDTO.AuthResponse) response.getBody();
        assertThat(authResponse.getAccessToken()).isNotBlank();
        assertThat(jwtUtil.validateAccessToken(authResponse.getAccessToken())).isTrue();
        assertThat(authResponse.getRefreshToken()).isNull();
        assertThat(servletResponse.getHeader("Set-Cookie"))
                .contains(RefreshTokenCookieService.COOKIE_NAME + "=")
                .contains("HttpOnly");

        ResponseEntity<?> replayResponse = authController.refreshAccessToken(
                refreshToken, new MockHttpServletRequest(), new MockHttpServletResponse());
        assertThat(replayResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("④ Refresh Token 갱신 실패 - 위조된 토큰에 대해 401 반환 검증")
    void testRefreshTokenInvalid() {
        ResponseEntity<?> response = authController.refreshAccessToken(
                "forged.fake.refresh.token", new MockHttpServletRequest(), new MockHttpServletResponse());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("⑤ 이메일 & 닉네임 중복 확인 API 검증")
    void testCheckEmailAndNicknameAvailability() {
        // 미등록 상태 확인
        ResponseEntity<AuthDTO.AvailabilityResponse> emailRes1 = authController.checkEmail("new_email_unique@petcare.com");
        assertThat(emailRes1.getBody().isAvailable()).isTrue();

        ResponseEntity<AuthDTO.AvailabilityResponse> nickRes1 = authController.checkNickname("새로운닉네임");
        assertThat(nickRes1.getBody().isAvailable()).isTrue();

        // 사용자 등록 후 중복 확인
        UserDTO user = UserDTO.builder()
                .email("exist@petcare.com")
                .password(passwordEncoder.encode(password))
                .nickname("기존닉네임")
                .provider("LOCAL")
                .status("ACTIVE")
                .build();
        userMapper.insert(user);

        ResponseEntity<AuthDTO.AvailabilityResponse> emailRes2 = authController.checkEmail("exist@petcare.com");
        assertThat(emailRes2.getBody().isAvailable()).isFalse();

        ResponseEntity<AuthDTO.AvailabilityResponse> nickRes2 = authController.checkNickname("기존닉네임");
        assertThat(nickRes2.getBody().isAvailable()).isFalse();
    }

    @Test
    @DisplayName("⑦ 회원 탈퇴 (Soft Delete) - DB 상태가 DELETED로 변경되고 로그인 차단(403) 검증")
    void testWithdrawSoftDelete() {
        // 사용자 등록
        UserDTO user = UserDTO.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .provider("LOCAL")
                .role("ROLE_USER")
                .status("ACTIVE")
                .build();
        userMapper.insert(user);

        // 인증 컨텍스트 설정
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
        );

        // 탈퇴 요청
        ResponseEntity<?> withdrawResponse = authController.withdraw(new MockHttpServletResponse());
        assertThat(withdrawResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // DB 확인: status가 DELETED로 Soft Delete 되었는지 검증
        UserDTO updatedUser = userMapper.findByEmail(email);
        assertThat(updatedUser.getStatus()).isEqualTo("DELETED");

        // 탈퇴한 계정으로 로그인 시도 -> 403 차단 검증
        AuthDTO.LoginRequest loginRequest = AuthDTO.LoginRequest.builder()
                .email(email)
                .password(password)
                .build();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(loginRequest, "loginRequest");
        ResponseEntity<?> loginResponse = authController.login(
                loginRequest, bindingResult, new MockHttpServletResponse());

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("⑧ 비밀번호 찾기 - 이메일 검증 도입 전에는 비밀번호를 변경하지 않고 503 반환")
    void testForgotPasswordIsDisabledUntilEmailVerificationExists() {
        // 사용자 등록
        UserDTO user = UserDTO.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .provider("LOCAL")
                .role("ROLE_USER")
                .status("ACTIVE")
                .build();
        userMapper.insert(user);

        // 비밀번호 찾기 요청
        AuthDTO.ForgotPasswordRequest forgotRequest = AuthDTO.ForgotPasswordRequest.builder()
                .email(email)
                .build();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(forgotRequest, "forgotRequest");
        ResponseEntity<?> forgotResponse = authController.forgotPassword(forgotRequest, bindingResult);

        assertThat(forgotResponse.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);

        // 기존 비밀번호가 바뀌지 않아야 한다.
        AuthDTO.LoginRequest loginRequest = AuthDTO.LoginRequest.builder()
                .email(email)
                .password(password)
                .build();
        BeanPropertyBindingResult loginBinding = new BeanPropertyBindingResult(loginRequest, "loginRequest");
        ResponseEntity<?> loginResponse = authController.login(
                loginRequest, loginBinding, new MockHttpServletResponse());

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}

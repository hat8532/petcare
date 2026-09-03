package com.petcare.backend.domain.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    private UserDTO getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String email = auth.getName();
        return userMapper.findByEmail(email);
    }

    /**
     * ① 내 정보 상세 조회 (비밀번호 제외)
     * GET /api/v1/users/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile() {
        UserDTO user = getAuthenticatedUser();
        if (user == null || "DELETED".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "인증 정보가 유효하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        user.setPassword(null);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", user);
        return ResponseEntity.ok(response);
    }

    /**
     * ② 닉네임 변경 API
     * PUT /api/v1/users/me/nickname
     */
    @PutMapping("/me/nickname")
    public ResponseEntity<?> updateNickname(@RequestBody Map<String, String> request) {
        UserDTO user = getAuthenticatedUser();
        if (user == null || "DELETED".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "인증 정보가 유효하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        String newNickname = request.get("nickname");
        if (newNickname == null || newNickname.trim().length() < 2) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "닉네임은 2자 이상 입력해주세요.");
            return ResponseEntity.badRequest().body(error);
        }

        newNickname = newNickname.trim();

        // 본인의 기존 닉네임과 동일하지 않은 경우 중복 체크
        if (!newNickname.equals(user.getNickname()) && userMapper.countByNickname(newNickname) > 0) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "이미 사용 중인 닉네임입니다.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        user.setNickname(newNickname);
        userMapper.update(user);
        user.setPassword(null);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "닉네임이 성공적으로 변경되었습니다.");
        response.put("data", user);
        return ResponseEntity.ok(response);
    }

    /**
     * ③ 비밀번호 수정 API
     * PUT /api/v1/users/me/password
     */
    @PutMapping("/me/password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        UserDTO user = getAuthenticatedUser();
        if (user == null || "DELETED".equalsIgnoreCase(user.getStatus())) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "인증 정보가 유효하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        // 소셜 계정 체크
        if (!"LOCAL".equalsIgnoreCase(user.getProvider()) && user.getProvider() != null) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "소셜 로그인(" + user.getProvider() + ") 계정은 비밀번호를 변경할 수 없습니다.");
            return ResponseEntity.badRequest().body(error);
        }

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        if (currentPassword == null || currentPassword.isBlank() ||
            newPassword == null || newPassword.isBlank()) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
            return ResponseEntity.badRequest().body(error);
        }

        // 현재 비밀번호 일치 검증
        if (!passwordEncoder.matches(currentPassword.trim(), user.getPassword())) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "현재 비밀번호가 일치하지 않습니다.");
            return ResponseEntity.badRequest().body(error);
        }

        // 새 비밀번호 유효성 검사 (8자 이상)
        if (newPassword.trim().length() < 8) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "FAIL");
            error.put("message", "새 비밀번호는 8자 이상이어야 합니다.");
            return ResponseEntity.badRequest().body(error);
        }

        // 비밀번호 암호화 후 업데이트
        String encodedNewPassword = passwordEncoder.encode(newPassword.trim());
        userMapper.updatePassword(user.getId(), encodedNewPassword);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "비밀번호가 성공적으로 변경되었습니다.");
        return ResponseEntity.ok(response);
    }
}

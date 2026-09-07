package com.petcare.backend.domain.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/addresses")
public class UserAddressController {

    private final UserAddressMapper userAddressMapper;
    private final UserMapper userMapper;

    public UserAddressController(UserAddressMapper userAddressMapper, UserMapper userMapper) {
        this.userAddressMapper = userAddressMapper;
        this.userMapper = userMapper;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getUserAddresses(
            @PathVariable("userId") Long userId,
            Authentication authentication
    ) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }
        if (!currentUser.getId().equals(userId) && !isAdmin(currentUser)) {
            return error(HttpStatus.FORBIDDEN, "본인의 주소 정보만 조회할 수 있습니다.");
        }

        List<UserAddressDTO> addresses = userAddressMapper.findByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", addresses.size());
        response.put("data", addresses);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAddress(
            @RequestBody UserAddressDTO address,
            Authentication authentication
    ) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }

        address.setUserId(currentUser.getId());
        if (Boolean.TRUE.equals(address.getIsDefault())) {
            userAddressMapper.resetDefaultByUserId(currentUser.getId());
        }

        userAddressMapper.insert(address);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "주소가 성공적으로 등록되었습니다.");
        response.put("data", address);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @PathVariable("id") Long id,
            Authentication authentication
    ) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }

        int deletedRows = userAddressMapper.deleteByIdAndUserId(id, currentUser.getId());
        if (deletedRows == 0) {
            return error(HttpStatus.NOT_FOUND, "주소를 찾을 수 없습니다.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "주소가 삭제되었습니다.");

        return ResponseEntity.ok(response);
    }

    private UserDTO getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())
                || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return userMapper.findByEmail(authentication.getName());
    }

    private boolean isAdmin(UserDTO user) {
        return "ROLE_ADMIN".equalsIgnoreCase(user.getRole());
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAIL");
        response.put("message", message);
        return ResponseEntity.status(status).body(response);
    }
}

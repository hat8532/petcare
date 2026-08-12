package com.petcare.backend.domain.user;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/addresses")
@CrossOrigin(origins = "*")
public class UserAddressController {

    private final UserAddressMapper userAddressMapper;

    public UserAddressController(UserAddressMapper userAddressMapper) {
        this.userAddressMapper = userAddressMapper;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getUserAddresses(@PathVariable("userId") Long userId) {
        List<UserAddressDTO> addresses = userAddressMapper.findByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", addresses.size());
        response.put("data", addresses);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAddress(@RequestBody UserAddressDTO address) {
        if (Boolean.TRUE.equals(address.getIsDefault())) {
            userAddressMapper.resetDefaultByUserId(address.getUserId());
        }

        userAddressMapper.insert(address);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "주소가 성공적으로 등록되었습니다.");
        response.put("data", address);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAddress(@PathVariable("id") Long id) {
        userAddressMapper.deleteById(id);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "주소가 삭제되었습니다.");

        return ResponseEntity.ok(response);
    }
}

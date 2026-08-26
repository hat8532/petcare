package com.petcare.backend.domain.pet;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pets")
@CrossOrigin(origins = "*")
public class PetController {

    private final PetMapper petMapper;
    private final UserMapper userMapper;

    public PetController(PetMapper petMapper, UserMapper userMapper) {
        this.petMapper = petMapper;
        this.userMapper = userMapper;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getPetsByUserId(
            @PathVariable("userId") Long userId,
            Authentication authentication
    ) {
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            String currentEmail = authentication.getName();
            UserDTO currentUser = userMapper.findByEmail(currentEmail);

            // IDOR 방지: 본인 계정이 아니면서 관리자(ROLE_ADMIN)도 아닌 경우 403 차단
            if (currentUser != null && !currentUser.getId().equals(userId) && !"ROLE_ADMIN".equalsIgnoreCase(currentUser.getRole())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "FAIL");
                errorResponse.put("message", "본인의 반려동물 정보만 조회할 수 있습니다.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
            }
        }

        List<PetDTO> pets = petMapper.findByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", pets.size());
        response.put("data", pets);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPet(@RequestBody PetDTO pet) {
        if (pet.getUserId() == null) pet.setUserId(1L);
        if (pet.getIcon() == null) {
            pet.setIcon("CAT".equalsIgnoreCase(pet.getSpecies()) ? "🐱" : "🐶");
        }

        petMapper.insert(pet);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "반려동물이 성공적으로 등록되었습니다.");
        response.put("data", pet);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updatePet(@PathVariable("id") Long id, @RequestBody PetDTO pet) {
        pet.setId(id);
        petMapper.update(pet);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "반려동물 정보가 성공적으로 수정되었습니다.");
        response.put("data", pet);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletePet(@PathVariable("id") Long id) {
        petMapper.deleteById(id);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "반려동물이 삭제되었습니다.");

        return ResponseEntity.ok(response);
    }
}

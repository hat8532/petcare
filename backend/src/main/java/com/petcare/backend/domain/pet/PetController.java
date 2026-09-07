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
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }
        if (!currentUser.getId().equals(userId) && !isAdmin(currentUser)) {
            return error(HttpStatus.FORBIDDEN, "본인의 반려동물 정보만 조회할 수 있습니다.");
        }

        List<PetDTO> pets = petMapper.findByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", pets.size());
        response.put("data", pets);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPet(@RequestBody PetDTO pet, Authentication authentication) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }

        pet.setUserId(currentUser.getId());
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
    public ResponseEntity<Map<String, Object>> updatePet(
            @PathVariable("id") Long id,
            @RequestBody PetDTO pet,
            Authentication authentication
    ) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }

        PetDTO existingPet = petMapper.findById(id);
        if (existingPet == null) {
            return error(HttpStatus.NOT_FOUND, "반려동물을 찾을 수 없습니다.");
        }
        if (!currentUser.getId().equals(existingPet.getUserId()) && !isAdmin(currentUser)) {
            return error(HttpStatus.FORBIDDEN, "본인의 반려동물 정보만 수정할 수 있습니다.");
        }

        pet.setId(id);
        pet.setUserId(existingPet.getUserId());
        int updatedRows = petMapper.update(pet);
        if (updatedRows == 0) {
            return error(HttpStatus.NOT_FOUND, "반려동물을 찾을 수 없습니다.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "반려동물 정보가 성공적으로 수정되었습니다.");
        response.put("data", pet);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletePet(@PathVariable("id") Long id, Authentication authentication) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }

        PetDTO existingPet = petMapper.findById(id);
        if (existingPet == null) {
            return error(HttpStatus.NOT_FOUND, "반려동물을 찾을 수 없습니다.");
        }
        if (!currentUser.getId().equals(existingPet.getUserId()) && !isAdmin(currentUser)) {
            return error(HttpStatus.FORBIDDEN, "본인의 반려동물만 삭제할 수 있습니다.");
        }

        int deletedRows = petMapper.deleteByIdAndUserId(id, existingPet.getUserId());
        if (deletedRows == 0) {
            return error(HttpStatus.NOT_FOUND, "반려동물을 찾을 수 없습니다.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "반려동물이 삭제되었습니다.");

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

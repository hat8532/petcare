package com.petcare.backend.domain.pet;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pets")
@CrossOrigin(origins = "*")
public class PetController {

    private final PetMapper petMapper;

    public PetController(PetMapper petMapper) {
        this.petMapper = petMapper;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getPetsByUserId(@PathVariable("userId") Long userId) {
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

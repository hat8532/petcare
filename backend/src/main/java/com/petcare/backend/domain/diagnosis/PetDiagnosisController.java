package com.petcare.backend.domain.diagnosis;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pets/{petId}/diagnoses")
public class PetDiagnosisController {

    private final DiagnosisService diagnosisService;

    public PetDiagnosisController(DiagnosisService diagnosisService) {
        this.diagnosisService = diagnosisService;
    }

    @GetMapping
    public ResponseEntity<DiagnosisApiResponse<DiagnosisHistoryPage>> getDiagnosisHistory(
            @PathVariable("petId") Long petId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "5") int size,
            Authentication authentication) {
        return ResponseEntity.ok(DiagnosisApiResponse.success(
                diagnosisService.getDiagnosisHistoryByPet(
                        petId, ownerEmail(authentication), page, size)));
    }

    private String ownerEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()) {
            throw DiagnosisAccessException.authenticationRequired();
        }
        return authentication.getName();
    }
}

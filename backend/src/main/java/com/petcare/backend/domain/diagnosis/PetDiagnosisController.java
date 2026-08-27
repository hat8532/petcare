package com.petcare.backend.domain.diagnosis;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pets/{petId}/diagnoses")
@CrossOrigin(origins = "*")
public class PetDiagnosisController {

    private final DiagnosisService diagnosisService;

    public PetDiagnosisController(DiagnosisService diagnosisService) {
        this.diagnosisService = diagnosisService;
    }

    @GetMapping
    public ResponseEntity<DiagnosisApiResponse<List<DiagnosisResultResponse>>> getDiagnosisHistory(
            @PathVariable("petId") Long petId) {
        return ResponseEntity.ok(DiagnosisApiResponse.success(
                diagnosisService.getDiagnosisHistoryByPet(petId)));
    }
}

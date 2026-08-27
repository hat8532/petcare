package com.petcare.backend.domain.diagnosis;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/diagnosis")
@CrossOrigin(origins = "*")
public class DiagnosisController {

    private final DiagnosisService diagnosisService;

    public DiagnosisController(DiagnosisService diagnosisService) {
        this.diagnosisService = diagnosisService;
    }

    @GetMapping("/symptoms")
    public ResponseEntity<DiagnosisApiResponse<Map<String, List<String>>>> getSymptoms() {
        return ResponseEntity.ok(DiagnosisApiResponse.success(diagnosisService.getSymptoms()));
    }

    @GetMapping("/{diagnosisId}")
    public ResponseEntity<DiagnosisApiResponse<DiagnosisResultResponse>> getDiagnosis(
            @PathVariable("diagnosisId") Long diagnosisId) {
        return ResponseEntity.ok(DiagnosisApiResponse.success(diagnosisService.getDiagnosis(diagnosisId)));
    }

    @PostMapping
    public ResponseEntity<DiagnosisApiResponse<DiagnosisResultResponse>> analyzeDiagnosis(
            @Valid @RequestBody DiagnosisAnalyzeRequest request) {
        return ResponseEntity.ok(DiagnosisApiResponse.success(diagnosisService.analyzeDiagnosis(request)));
    }
}

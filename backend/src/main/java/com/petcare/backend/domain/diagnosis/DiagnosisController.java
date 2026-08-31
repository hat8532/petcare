package com.petcare.backend.domain.diagnosis;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/diagnosis")
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
            @PathVariable("diagnosisId") Long diagnosisId,
            Authentication authentication) {
        return ResponseEntity.ok(DiagnosisApiResponse.success(
                diagnosisService.getDiagnosis(diagnosisId, ownerEmail(authentication))));
    }

    @GetMapping("/{diagnosisId}/image")
    public ResponseEntity<byte[]> getDiagnosisImage(
            @PathVariable("diagnosisId") Long diagnosisId,
            Authentication authentication) {
        DiagnosisImageResource image = diagnosisService.getDiagnosisImage(
                diagnosisId, ownerEmail(authentication));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(image.contentType()))
                .body(image.bytes());
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<DiagnosisApiResponse<DiagnosisResultResponse>> analyzeDiagnosis(
            @Valid @RequestPart("request") DiagnosisAnalyzeRequest request,
            @RequestPart("image") MultipartFile image,
            Authentication authentication) {
        return ResponseEntity.ok(DiagnosisApiResponse.success(
                diagnosisService.analyzeDiagnosis(request, image, ownerEmail(authentication))));
    }

    private String ownerEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()) {
            throw DiagnosisAccessException.authenticationRequired();
        }
        return authentication.getName();
    }
}

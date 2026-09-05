package com.petcare.backend.domain.diagnosis;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosisRecordDTO {
    private Long id;
    private Long userId;
    private Long petId;
    private String idempotencyKey;
    private String requestHash;
    private String affectedArea;
    private String symptomsJson;
    private String imageUrl;
    private String description;
    private String riskLevel;
    private String riskLabel;
    private String diseasesJson;
    private String reportContent;
    private LocalDateTime createdAt;
}

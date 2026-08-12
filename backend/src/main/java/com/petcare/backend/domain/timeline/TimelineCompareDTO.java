package com.petcare.backend.domain.timeline;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimelineCompareDTO {
    private Long id;
    private Long petId;
    private Long beforeDiagnosisId;
    private String beforeImageUrl;
    private String beforeDate;
    private String afterImageUrl;
    private String afterDate;
    private String progressStatus;
    private String geminiAnalysis;
    private LocalDateTime createdAt;
}

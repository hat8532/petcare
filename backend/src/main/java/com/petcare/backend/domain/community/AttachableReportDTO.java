package com.petcare.backend.domain.community;

import lombok.*;

import java.time.LocalDateTime;

// 글쓰기 화면의 "리포트 첨부" 목록에 쓰는 요약 정보.
// 진단 결과 전문(reportContent)은 담지 않는다. 고르기만 하면 되는 화면이라
// 필요 없는 데이터를 내려보내면 응답만 무거워진다.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttachableReportDTO {
    private Long id;
    private String affectedArea;
    private String riskLabel;
    private String riskLevel;

    // "안구 · 결막염 의심 (2026.09.03)" 처럼 화면에 그대로 뿌릴 한 줄.
    private String label;

    private LocalDateTime createdAt;
}

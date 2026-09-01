package com.petcare.backend.domain.diagnosis;

import java.util.List;

public record DiagnosisHistoryPage(
        List<DiagnosisResultResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public DiagnosisHistoryPage {
        content = List.copyOf(content);
    }
}

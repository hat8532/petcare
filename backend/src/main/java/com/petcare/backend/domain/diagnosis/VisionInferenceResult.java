package com.petcare.backend.domain.diagnosis;

import java.util.List;

public record VisionInferenceResult(
        String mode,
        String model,
        String modelVersion,
        List<Prediction> predictions,
        List<String> limitations,
        String failureCode,
        String requestId
) {
    public record Prediction(String diseaseName, double probability) {
    }

    public VisionInferenceResult {
        predictions = predictions == null ? List.of() : List.copyOf(predictions);
        limitations = limitations == null ? List.of() : List.copyOf(limitations);
    }

    public static VisionInferenceResult unavailable(String failureCode, String requestId) {
        return new VisionInferenceResult(
                "RULE_FALLBACK",
                null,
                null,
                List.of(),
                List.of("승인된 Vision Model 결과가 아니며 Image는 형식 검증에만 사용됐습니다."),
                failureCode,
                requestId
        );
    }

    public boolean hasPredictions() {
        return "VISION".equals(mode) && !predictions.isEmpty();
    }
}

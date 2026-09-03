package com.petcare.backend.domain.diagnosis;

import java.util.List;

public record VisionInferenceResult(
        String mode,
        String model,
        String modelVersion,
        List<Prediction> predictions,
        List<String> limitations,
        String ragReport,
        List<RagSource> ragSources,
        String failureCode,
        String requestId
) {
    public record Prediction(String diseaseName, double probability) {
    }

    public record RagSource(String sourceId, String title, String publisher, String sourceUrl) {
    }

    public VisionInferenceResult {
        predictions = predictions == null ? List.of() : List.copyOf(predictions);
        limitations = limitations == null ? List.of() : List.copyOf(limitations);
        ragSources = ragSources == null ? List.of() : List.copyOf(ragSources);
    }

    public VisionInferenceResult(
            String mode,
            String model,
            String modelVersion,
            List<Prediction> predictions,
            List<String> limitations,
            String failureCode,
            String requestId) {
        this(mode, model, modelVersion, predictions, limitations, null, List.of(), failureCode, requestId);
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
        return ("VISION".equals(mode)
                || "GEMINI_MULTIMODAL".equals(mode)
                || "GEMINI_RAG_PROTOTYPE".equals(mode)
                || "EXPERIMENTAL_DEMO".equals(mode))
                && !predictions.isEmpty();
    }
}

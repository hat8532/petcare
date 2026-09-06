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
                List.of("사용 가능한 AI 이미지 분석 결과를 확보하지 못했습니다. 위험도는 입력한 증상 규칙으로 계산했습니다."),
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

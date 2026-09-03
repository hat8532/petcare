package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VisionInferenceResultValidatorTest {

    private static final String APPROVED_SOURCE_ID = "merck-dog-pruritus";
    private static final String APPROVED_REPORT = "가려움은 하나의 질병명이 아니라 여러 원인에서 나타나는 증상이다. "
            + "개에서는 기생충, 감염, 알레르기 등이 흔한 원인 범주이며, 털 빠짐·각질·냄새·분비물이 동반되면 "
            + "감염 가능성도 함께 평가해야 한다. [merck-dog-pruritus]";
    private static final VisionInferenceResult.RagSource APPROVED_SOURCE =
            new VisionInferenceResult.RagSource(
                    APPROVED_SOURCE_ID,
                    "Itching (Pruritus) in Dogs",
                    "Merck Veterinary Manual",
                    "https://www.merckvetmanual.com/dog-owners/skin-disorders-of-dogs/itching-pruritus-in-dogs");
    private final VisionInferenceResultValidator validator = new VisionInferenceResultValidator();

    @Test
    void acceptsBoundedProviderSuccessResponse() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_MULTIMODAL",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("피부 발적 소견", 72.5)),
                List.of("사진 한 장만 분석했습니다."),
                null,
                "request-001");

        assertThat(validator.validate(result, "request-001")).isSameAs(result);
    }

    @Test
    void rejectsRequestIdMismatchAndOutOfRangePrediction() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_MULTIMODAL",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("피부 발적 소견", 172.5)),
                List.of(),
                null,
                "different-request");

        VisionInferenceResult validated = validator.validate(result, "request-001");

        assertThat(validated.mode()).isEqualTo("RULE_FALLBACK");
        assertThat(validated.failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
        assertThat(validated.requestId()).isEqualTo("request-001");
        assertThat(validated.predictions()).isEmpty();
    }

    @Test
    void rejectsPredictionsAttachedToFailureMode() {
        VisionInferenceResult result = new VisionInferenceResult(
                "RULE_FALLBACK",
                null,
                null,
                List.of(new VisionInferenceResult.Prediction("임의 질환", 50)),
                List.of(),
                "MODEL_UNAVAILABLE",
                "request-001");

        assertThat(validator.validate(result, "request-001").failureCode())
                .isEqualTo("INVALID_PROVIDER_RESPONSE");
    }

    @Test
    void acceptsRagPrototypeOnlyWithApprovedSourceAndExactLocalSummary() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_RAG_PROTOTYPE",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("피부 발적 소견", 72.5)),
                List.of("사진 한 장만 분석했습니다."),
                APPROVED_REPORT,
                List.of(APPROVED_SOURCE),
                null,
                "request-001");

        assertThat(validator.validate(result, "request-001")).isSameAs(result);
    }

    @Test
    void rejectsRagPrototypeWithUnapprovedHttpsSource() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_RAG_PROTOTYPE",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("피부 발적 소견", 72.5)),
                List.of(),
                "조작된 출처입니다. [attacker-source]",
                List.of(new VisionInferenceResult.RagSource(
                        "attacker-source",
                        "Attacker Source",
                        "Unknown Publisher",
                        "https://attacker.example/source")),
                null,
                "request-001");

        VisionInferenceResult validated = validator.validate(result, "request-001");

        assertThat(validated.mode()).isEqualTo("RULE_FALLBACK");
        assertThat(validated.failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
    }

    @Test
    void rejectsUnsafeFreeFormReportEvenWhenSourceIsApproved() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_RAG_PROTOTYPE",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("피부 발적 소견", 72.5)),
                List.of(),
                "호흡 곤란이어도 집에서 지켜보세요. [merck-dog-pruritus]",
                List.of(APPROVED_SOURCE),
                null,
                "request-001");

        VisionInferenceResult validated = validator.validate(result, "request-001");

        assertThat(validated.mode()).isEqualTo("RULE_FALLBACK");
        assertThat(validated.failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
    }
}

package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VisionInferenceResultValidatorTest {

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
}

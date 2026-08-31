package com.petcare.backend.domain.diagnosis;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class VisionInferenceResultValidator {

    private static final Set<String> SUCCESS_MODES = Set.of(
            "VISION", "GEMINI_MULTIMODAL", "EXPERIMENTAL_DEMO");
    private static final Set<String> FAILURE_CODES = Set.of(
            "VISION_DISABLED",
            "MODEL_UNAVAILABLE",
            "MODEL_MANIFEST_MISSING",
            "MODEL_MANIFEST_INVALID",
            "MODEL_NOT_APPROVED",
            "MODEL_ARTIFACT_MISSING",
            "MODEL_ARTIFACT_DIGEST_MISMATCH",
            "MODEL_LOADER_NOT_IMPLEMENTED",
            "UNSUPPORTED_MEDIA_TYPE",
            "OUT_OF_SCOPE",
            "INVALID_INPUT",
            "INVALID_PROVIDER_REQUEST",
            "INVALID_PROVIDER_RESPONSE",
            "INFERENCE_TIMEOUT",
            "PROVIDER_AUTH_FAILED",
            "PROVIDER_MODEL_UNAVAILABLE",
            "PROVIDER_RATE_LIMITED",
            "PROVIDER_REJECTED",
            "PROVIDER_UNAVAILABLE");

    public VisionInferenceResult validate(VisionInferenceResult result, String expectedRequestId) {
        if (result == null
                || !expectedRequestId.equals(result.requestId())
                || !validText(result.mode(), 40)
                || !validText(result.requestId(), 100)
                || !validNullableText(result.model(), 120)
                || !validNullableText(result.modelVersion(), 80)
                || !validLimitations(result.limitations())) {
            return invalid(expectedRequestId);
        }

        if ("RULE_FALLBACK".equals(result.mode())) {
            if (!result.predictions().isEmpty()
                    || result.failureCode() == null
                    || !FAILURE_CODES.contains(result.failureCode())) {
                return invalid(expectedRequestId);
            }
            return result;
        }

        if (!SUCCESS_MODES.contains(result.mode())
                || result.failureCode() != null
                || result.predictions().isEmpty()
                || result.predictions().size() > 3
                || !validPredictions(result.predictions())) {
            return invalid(expectedRequestId);
        }
        return result;
    }

    public String normalizeFailureCode(String failureCode) {
        return FAILURE_CODES.contains(failureCode) ? failureCode : "PROVIDER_UNAVAILABLE";
    }

    private boolean validPredictions(List<VisionInferenceResult.Prediction> predictions) {
        return predictions.stream().allMatch(prediction -> prediction != null
                && validText(prediction.diseaseName(), 120)
                && Double.isFinite(prediction.probability())
                && prediction.probability() >= 0
                && prediction.probability() <= 100);
    }

    private boolean validLimitations(List<String> limitations) {
        return limitations != null
                && limitations.size() <= 10
                && limitations.stream().allMatch(value -> validText(value, 500));
    }

    private boolean validNullableText(String value, int maxLength) {
        return value == null || validText(value, maxLength);
    }

    private boolean validText(String value, int maxLength) {
        return value != null && !value.isBlank() && value.length() <= maxLength;
    }

    private VisionInferenceResult invalid(String requestId) {
        return VisionInferenceResult.unavailable("INVALID_PROVIDER_RESPONSE", requestId);
    }
}

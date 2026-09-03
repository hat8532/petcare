package com.petcare.backend.domain.diagnosis;

import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class VisionInferenceResultValidator {

    private static final Set<String> SUCCESS_MODES = Set.of(
            "VISION", "GEMINI_MULTIMODAL", "GEMINI_RAG_PROTOTYPE", "EXPERIMENTAL_DEMO");
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
            "PROVIDER_UNAVAILABLE",
            "RAG_CORPUS_UNAVAILABLE",
            "RAG_NO_EVIDENCE");
    private static final Map<String, ApprovedRagDocument> APPROVED_RAG_DOCUMENTS = Map.of(
            "merck-dermatitis-overview", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource(
                            "merck-dermatitis-overview",
                            "Dermatitis in Animals",
                            "Merck Veterinary Manual",
                            "https://www.merckvetmanual.com/integumentary-system/integumentary-system-introduction/dermatitis-in-animals"),
                    "피부 문제에서는 가려움, 붉어짐, 각질, 피부가 두꺼워지는 변화, 색소 변화, 냄새, 탈모 등이 함께 관찰될 수 있다. "
                            + "손상된 피부에는 세균이나 효모 감염이 뒤따를 수 있으므로 사진만으로 원인을 하나로 단정하면 안 된다."),
            "merck-dog-pruritus", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource(
                            "merck-dog-pruritus",
                            "Itching (Pruritus) in Dogs",
                            "Merck Veterinary Manual",
                            "https://www.merckvetmanual.com/dog-owners/skin-disorders-of-dogs/itching-pruritus-in-dogs"),
                    "가려움은 하나의 질병명이 아니라 여러 원인에서 나타나는 증상이다. 개에서는 기생충, 감염, 알레르기 등이 흔한 원인 범주이며, "
                            + "털 빠짐·각질·냄새·분비물이 동반되면 감염 가능성도 함께 평가해야 한다."),
            "cornell-canine-atopy", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource(
                            "cornell-canine-atopy",
                            "Atopic Dermatitis (Atopy)",
                            "Cornell University College of Veterinary Medicine",
                            "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/atopic-dermatitis-atopy"),
                    "개 아토피 피부염에서는 심한 가려움이 흔하며 반복해서 긁거나 핥는 행동 때문에 붉어짐과 탈모가 생길 수 있다. "
                            + "피부 장벽이 손상되면 이차 감염이 동반될 수 있어 지속되거나 악화되는 증상은 수의사의 진료가 필요하다."),
            "merck-flea-allergy", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource(
                            "merck-flea-allergy",
                            "Flea Allergy Dermatitis in Dogs and Cats",
                            "Merck Veterinary Manual",
                            "https://www.merckvetmanual.com/integumentary-system/fleas-and-flea-allergy-dermatitis/flea-allergy-dermatitis-in-dogs-and-cats"),
                    "벼룩 알레르기 피부염은 개와 고양이 모두에서 심한 가려움을 만들 수 있다. 개는 허리 아래쪽과 꼬리 시작 부위, "
                            + "고양이는 머리·목·등에서 병변이 관찰될 수 있지만, 병력과 임상 소견 및 다른 원인의 배제가 함께 필요하다."),
            "merck-dermatophytosis", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource(
                            "merck-dermatophytosis",
                            "Dermatophytosis in Dogs and Cats",
                            "Merck Veterinary Manual",
                            "https://www.merckvetmanual.com/integumentary-system/dermatophytosis/dermatophytosis-in-dogs-and-cats"),
                    "피부사상균증에서는 탈모, 각질, 딱지, 붉어짐과 정도가 다양한 가려움이 나타날 수 있다. 겉모습만으로 확진할 수 없고 "
                            + "모발·각질 검사나 배양 등 여러 검사를 조합하며, 사람에게 전파될 가능성도 고려해야 한다."),
            "avma-pet-first-aid", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource(
                            "avma-pet-first-aid",
                            "Pet First Aid",
                            "American Veterinary Medical Association",
                            "https://ebusiness.avma.org/files/productdownloads/mcm-client-brochures-pet-first-aid-2023.pdf"),
                    "응급 징후가 있으면 보호자용 안내나 응급처치는 동물병원 진료를 대신할 수 없다. 즉시 수의사 또는 응급 동물병원에 연락하고, "
                            + "전문가 지시 없이 사람용 약이나 검증되지 않은 처치를 적용하지 않는다."));

    public VisionInferenceResult validate(VisionInferenceResult result, String expectedRequestId) {
        if (result == null
                || !expectedRequestId.equals(result.requestId())
                || !validText(result.mode(), 40)
                || !validText(result.requestId(), 100)
                || !validNullableText(result.model(), 120)
                || !validNullableText(result.modelVersion(), 80)
                || !validNullableText(result.ragReport(), 1500)
                || !validRagSources(result.ragSources())
                || !validLimitations(result.limitations())) {
            return invalid(expectedRequestId);
        }

        if ("RULE_FALLBACK".equals(result.mode())) {
            if (!result.predictions().isEmpty()
                    || result.ragReport() != null
                    || !result.ragSources().isEmpty()
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
        if (!validRagPayload(result)) {
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

    private boolean validRagPayload(VisionInferenceResult result) {
        if (!"GEMINI_RAG_PROTOTYPE".equals(result.mode())) {
            return result.ragReport() == null && result.ragSources().isEmpty();
        }
        return validText(result.ragReport(), 1500)
                && !result.ragSources().isEmpty()
                && result.ragSources().size() <= 3
                && result.ragReport().equals(result.ragSources().stream()
                .map(source -> {
                    ApprovedRagDocument document = APPROVED_RAG_DOCUMENTS.get(source.sourceId());
                    return document.excerpt() + " [" + source.sourceId() + "]";
                })
                .collect(Collectors.joining("\n\n")));
    }

    private boolean validRagSources(List<VisionInferenceResult.RagSource> sources) {
        if (sources == null || sources.size() > 3) {
            return false;
        }
        Set<String> sourceIds = new HashSet<>();
        for (VisionInferenceResult.RagSource source : sources) {
            if (source == null
                    || !validText(source.sourceId(), 100)
                    || !sourceIds.add(source.sourceId())
                    || !source.equals(approvedSource(source.sourceId()))) {
                return false;
            }
        }
        return true;
    }

    private VisionInferenceResult.RagSource approvedSource(String sourceId) {
        ApprovedRagDocument document = APPROVED_RAG_DOCUMENTS.get(sourceId);
        return document == null ? null : document.source();
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

    private record ApprovedRagDocument(
            VisionInferenceResult.RagSource source,
            String excerpt
    ) {
    }
}

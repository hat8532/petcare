package com.petcare.backend.domain.diagnosis.inference;

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
    private static final Map<String, ApprovedRagDocument> APPROVED_RAG_DOCUMENTS = Map.ofEntries(
            Map.entry("merck-dermatitis-overview", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("merck-dermatitis-overview", "Dermatitis in Animals", "Merck Veterinary Manual", "https://www.merckvetmanual.com/integumentary-system/integumentary-system-introduction/dermatitis-in-animals"),
                    "피부 문제에서는 가려움, 붉어짐, 각질, 피부가 두꺼워지는 변화, 색소 변화, 냄새, 탈모 등이 함께 관찰될 수 있다. 손상된 피부에는 세균이나 효모 감염이 뒤따를 수 있으므로 사진만으로 원인을 하나로 단정하면 안 된다.",
                    Set.of("DOG", "CAT"), Set.of("SKIN"))),
            Map.entry("merck-dog-pruritus", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("merck-dog-pruritus", "Itching (Pruritus) in Dogs", "Merck Veterinary Manual", "https://www.merckvetmanual.com/dog-owners/skin-disorders-of-dogs/itching-pruritus-in-dogs"),
                    "가려움은 하나의 질병명이 아니라 여러 원인에서 나타나는 증상이다. 개에서는 기생충, 감염, 알레르기 등이 흔한 원인 범주이며, 털 빠짐·각질·냄새·분비물이 동반되면 감염 가능성도 함께 평가해야 한다.",
                    Set.of("DOG"), Set.of("SKIN"))),
            Map.entry("cornell-canine-atopy", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("cornell-canine-atopy", "Atopic Dermatitis (Atopy)", "Cornell University College of Veterinary Medicine", "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/atopic-dermatitis-atopy"),
                    "개 아토피 피부염에서는 심한 가려움이 흔하며 반복해서 긁거나 핥는 행동 때문에 붉어짐과 탈모가 생길 수 있다. 피부 장벽이 손상되면 이차 감염이 동반될 수 있어 지속되거나 악화되는 증상은 수의사의 진료가 필요하다.",
                    Set.of("DOG"), Set.of("SKIN"))),
            Map.entry("merck-flea-allergy", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("merck-flea-allergy", "Flea Allergy Dermatitis in Dogs and Cats", "Merck Veterinary Manual", "https://www.merckvetmanual.com/integumentary-system/fleas-and-flea-allergy-dermatitis/flea-allergy-dermatitis-in-dogs-and-cats"),
                    "벼룩 알레르기 피부염은 개와 고양이 모두에서 심한 가려움을 만들 수 있다. 개는 허리 아래쪽과 꼬리 시작 부위, 고양이는 머리·목·등에서 병변이 관찰될 수 있지만, 병력과 임상 소견 및 다른 원인의 배제가 함께 필요하다.",
                    Set.of("DOG", "CAT"), Set.of("SKIN"))),
            Map.entry("merck-dermatophytosis", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("merck-dermatophytosis", "Dermatophytosis in Dogs and Cats", "Merck Veterinary Manual", "https://www.merckvetmanual.com/integumentary-system/dermatophytosis/dermatophytosis-in-dogs-and-cats"),
                    "피부사상균증에서는 탈모, 각질, 딱지, 붉어짐과 정도가 다양한 가려움이 나타날 수 있다. 겉모습만으로 확진할 수 없고 모발·각질 검사나 배양 등 여러 검사를 조합하며, 사람에게 전파될 가능성도 고려해야 한다.",
                    Set.of("DOG", "CAT"), Set.of("SKIN"))),
            Map.entry("avma-pet-first-aid", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("avma-pet-first-aid", "Pet First Aid", "American Veterinary Medical Association", "https://ebusiness.avma.org/files/productdownloads/mcm-client-brochures-pet-first-aid-2023.pdf"),
                    "응급 징후가 있으면 보호자용 안내나 응급처치는 동물병원 진료를 대신할 수 없다. 즉시 수의사 또는 응급 동물병원에 연락하고, 전문가 지시 없이 사람용 약이나 검증되지 않은 처치를 적용하지 않는다.",
                    Set.of("DOG", "CAT"), Set.of("SKIN"))),
            Map.entry("eye-examination", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("eye-examination", "Physical Examination of the Eye in Animals", "MSD Veterinary Manual", "https://www.msdvetmanual.com/eye-diseases-and-disorders/ophthalmology/physical-examination-of-the-eye-in-animals"),
                    "눈 검사는 좌우 대칭과 겉으로 보이는 병변을 살피는 것에서 시작합니다. 눈물량, 각막 염색, 안압과 안구 내부 검사가 함께 필요할 수 있습니다.",
                    Set.of("DOG", "CAT"), Set.of("EYE"))),
            Map.entry("ear-examination", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("ear-examination", "Otitis Externa in Animals", "Merck Veterinary Manual", "https://www.merckvetmanual.com/ear-disorders/otitis-externa/otitis-externa-in-animals"),
                    "귀의 붉어짐, 분비물, 냄새, 가려움과 머리 흔들기는 평가에 필요한 정보입니다. 원인 확인에는 병력, 이경 검사와 분비물의 세포 검사가 사용됩니다.",
                    Set.of("DOG", "CAT"), Set.of("EAR"))),
            Map.entry("dog-mouth", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("dog-mouth", "Disorders of the Mouth in Dogs", "Merck Veterinary Manual", "https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/disorders-of-the-mouth-in-dogs"),
                    "구취, 침 흘림, 식욕 저하, 입 주변을 발로 만지는 행동은 구강 평가에 참고됩니다. 입안의 일부 문제는 겉으로 드러나지 않아 전체 구강 검사가 중요합니다.",
                    Set.of("DOG"), Set.of("MOUTH"))),
            Map.entry("cat-mouth", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("cat-mouth", "Disorders of the Mouth in Cats", "Merck Veterinary Manual", "https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/disorders-of-the-mouth-in-cats"),
                    "고양이의 구취, 침 흘림, 먹기 어려움과 입 주변 통증은 여러 원인으로 나타납니다. 원인 평가에는 병력과 전체 구강 검사가 필요합니다.",
                    Set.of("CAT"), Set.of("MOUTH"))),
            Map.entry("limb-examination", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("limb-examination", "Orthopedic Examination in Small Animals", "Merck Veterinary Manual", "https://www.merckvetmanual.com/musculoskeletal-system/lameness-in-small-animals/orthopedic-examination-in-small-animals"),
                    "절뚝거림은 서 있을 때와 움직일 때 함께 평가합니다. 부종, 통증, 관절 움직임과 좌우 차이를 진찰하고, 원인을 확인하기 위해 영상 검사가 필요할 수 있습니다.",
                    Set.of("DOG", "CAT"), Set.of("PAW_LIMB"))),
            Map.entry("respiratory-examination", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("respiratory-examination", "Diagnostic Techniques for Respiratory Disease in Animals", "MSD Veterinary Manual", "https://www.msdvetmanual.com/respiratory-system/respiratory-system-introduction/diagnostic-techniques-for-respiratory-disease-in-animals"),
                    "기침, 빠르거나 힘든 호흡, 콧물의 지속 양상은 평가에 필요한 정보입니다. 원인과 발생 부위를 알아보려면 병력, 신체검사와 필요에 따른 영상·검체 검사를 함께 사용합니다.",
                    Set.of("DOG", "CAT"), Set.of("NOSE_RESPIRATORY"))),
            Map.entry("digestive-examination", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("digestive-examination", "The Digestive System in Animals", "MSD Veterinary Manual", "https://www.msdvetmanual.com/digestive-system/digestive-system-introduction/the-digestive-system-in-animals"),
                    "식욕 변화, 구토, 배변 변화와 복부 팽창은 소화기 평가에 참고됩니다. 병력과 대변 특성을 살피고 복부 촉진·청진 및 필요한 검사를 통해 원인을 평가합니다.",
                    Set.of("DOG", "CAT"), Set.of("ABDOMEN"))),
            Map.entry("rabbit-illness", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("rabbit-illness", "Illness of Rabbits", "Merck Veterinary Manual", "https://www.merckvetmanual.com/all-other-pets/rabbits/illness-of-rabbits"),
                    "토끼의 눈·코 분비물, 피부 변화, 침 흘림, 식욕·배변·움직임 변화와 호흡 곤란은 진료가 필요한 징후입니다. 토끼는 아픈 모습을 숨길 수 있어 이런 변화가 있으면 수의사에게 바로 연락합니다.",
                    Set.of("RABBIT"), Set.of("SKIN", "EYE", "MOUTH", "PAW_LIMB", "NOSE_RESPIRATORY", "ABDOMEN", "CUSTOM"))),
            Map.entry("bird-illness", new ApprovedRagDocument(
                    new VisionInferenceResult.RagSource("bird-illness", "Illness in Pet Birds", "Merck Veterinary Manual", "https://www.merckvetmanual.com/bird-owners/routine-care-and-safety-of-birds/illness-in-pet-birds"),
                    "평소보다 부푼 깃털, 수면·활동·울음·식욕·배설 변화와 균형 저하는 새의 이상 징후일 수 있습니다. 숨쉴 때 꼬리가 들썩이는 등 호흡 변화가 보이면 수의사의 평가가 필요합니다.",
                    Set.of("BIRD"), Set.of("NOSE_RESPIRATORY", "ABDOMEN", "CUSTOM"))));

    private static final String NO_VISIBLE_FINDINGS = "사진에서 명확히 구분할 수 있는 외형 소견을 확보하지 못했습니다. 이상이 없다는 뜻은 아닙니다.";
    private static final Set<String> SPECIES = Set.of("DOG", "CAT", "RABBIT", "HAMSTER", "BIRD", "OTHER");
    private static final Set<String> COMMON_FINDINGS = Set.of(
            "발적 소견", "부종 소견", "습윤 또는 분비물 소견", "상처 또는 표면 손상 소견", "표면 색 변화 소견");
    private static final Map<String, Set<String>> AREA_FINDINGS = Map.of(
            "SKIN", Set.of("탈모 소견", "깃털 외관 변화 소견", "각질 소견", "딱지 소견", "기타 표면 변화 소견"),
            "EYE", Set.of("눈의 혼탁한 외관 소견", "눈을 감거나 좁힌 외관 소견"),
            "EAR", Set.of("딱지 소견", "눈에 보이는 이물·침착 소견"),
            "MOUTH", Set.of("구강 표면 침착 소견", "부리 외관 변화 소견"),
            "PAW_LIMB", Set.of("사지·날개 자세의 외관 차이", "발톱 외관 변화 소견"),
            "NOSE_RESPIRATORY", Set.of(), "ABDOMEN", Set.of("복부 윤곽의 외관 변화"), "CUSTOM", Set.of());

    public VisionInferenceResult validate(
            VisionInferenceResult result, String expectedRequestId, String species, String area) {
        if (result == null
                || !expectedRequestId.equals(result.requestId())
                || !validText(result.mode(), 40)
                || !validText(result.requestId(), 100)
                || !validNullableText(result.model(), 120)
                || !validNullableText(result.modelVersion(), 80)
                || !validNullableText(result.ragReport(), 1500)
                || !validRagSources(result.ragSources(), species, area)
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
                || (result.predictions().isEmpty() && !(isGemini(result)
                    && result.limitations().contains(NO_VISIBLE_FINDINGS)))
                || result.predictions().size() > 3
                || !validPredictions(result.predictions())
                || (isGemini(result) && !validFindingScope(result.predictions(), species, area))) {
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

    private boolean isGemini(VisionInferenceResult result) {
        return "GEMINI_MULTIMODAL".equals(result.mode()) || "GEMINI_RAG_PROTOTYPE".equals(result.mode());
    }

    private boolean validFindingScope(List<VisionInferenceResult.Prediction> predictions, String species, String area) {
        if (species == null || area == null || !SPECIES.contains(species) || !AREA_FINDINGS.containsKey(area)) {
            return false;
        }
        Set<String> allowed = new HashSet<>(COMMON_FINDINGS);
        if ("CUSTOM".equals(area)) {
            AREA_FINDINGS.values().forEach(allowed::addAll);
        } else {
            allowed.addAll(AREA_FINDINGS.get(area));
        }
        if (!Set.of("DOG", "CAT", "RABBIT", "HAMSTER").contains(species)) allowed.remove("탈모 소견");
        if (!"BIRD".equals(species)) allowed.remove("깃털 외관 변화 소견");
        if (!Set.of("BIRD", "OTHER").contains(species)) allowed.remove("부리 외관 변화 소견");
        Set<String> seen = new HashSet<>();
        return predictions.stream().allMatch(p -> allowed.contains(p.diseaseName()) && seen.add(p.diseaseName()));
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

    private boolean validRagSources(List<VisionInferenceResult.RagSource> sources, String species, String area) {
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
            ApprovedRagDocument document = APPROVED_RAG_DOCUMENTS.get(source.sourceId());
            if (species == null || area == null || !document.species().contains(species) || !document.areas().contains(area)) {
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
            String excerpt,
            Set<String> species,
            Set<String> areas
    ) {
    }
}

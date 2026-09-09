package com.petcare.backend.domain.diagnosis.inference;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;

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
    void acceptsAll48MenuScopesIncludingExplicitlyEmptyObservations() {
        for (String species : List.of("DOG", "CAT", "RABBIT", "HAMSTER", "BIRD", "OTHER")) {
            for (String area : List.of("SKIN", "EYE", "EAR", "MOUTH", "PAW_LIMB", "NOSE_RESPIRATORY", "ABDOMEN", "CUSTOM")) {
                for (boolean empty : List.of(false, true)) {
                    VisionInferenceResult result = new VisionInferenceResult(
                            "GEMINI_MULTIMODAL", "gemini-test", "v2",
                            empty ? List.of() : List.of(new VisionInferenceResult.Prediction("발적 소견", 50)),
                            List.of("사진에서 명확히 구분할 수 있는 외형 소견을 확보하지 못했습니다. 이상이 없다는 뜻은 아닙니다."),
                            null, "scope");
                    assertThat(validator.validate(result, "scope", species, area)).as("%s/%s empty=%s", species, area, empty).isSameAs(result);
                }
            }
        }
    }

    @Test
    void rejectsWrongAreaSpeciesFreeFormAndUndisclosedEmptyFindings() {
        for (String label : List.of("탈모 소견", "깃털 외관 변화 소견", "폐렴 확진", "사람용 약을 먹이세요")) {
            VisionInferenceResult result = new VisionInferenceResult(
                    "GEMINI_MULTIMODAL", "gemini-test", "v2",
                    List.of(new VisionInferenceResult.Prediction(label, 70)), List.of(), null, "scope");
            assertThat(validator.validate(result, "scope", "DOG", "EYE").failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
        }
        VisionInferenceResult empty = new VisionInferenceResult("GEMINI_MULTIMODAL", "gemini-test", "v2", List.of(), List.of(), null, "scope");
        assertThat(validator.validate(empty, "scope", "DOG", "EYE").failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
        VisionInferenceResult feather = new VisionInferenceResult("GEMINI_MULTIMODAL", "gemini-test", "v2",
                List.of(new VisionInferenceResult.Prediction("깃털 외관 변화 소견", 70)), List.of(), null, "scope");
        assertThat(validator.validate(feather, "scope", "BIRD", "SKIN")).isSameAs(feather);
        assertThat(validator.validate(feather, "scope", "DOG", "SKIN").failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
    }

    @Test
    void mlCorpusAndJavaAllowlistStayInSyncAndRejectCrossScopeSources() throws Exception {
        JsonNode corpus = new ObjectMapper().readTree(Path.of("../ml/knowledge/veterinary_skin_prototype.json").toFile());
        for (JsonNode doc : corpus.get("documents")) {
            var source = new VisionInferenceResult.RagSource(doc.get("id").asText(), doc.get("title").asText(),
                    doc.get("publisher").asText(), doc.get("sourceUrl").asText());
            var result = new VisionInferenceResult("GEMINI_RAG_PROTOTYPE", "gemini-test", "v2",
                    List.of(new VisionInferenceResult.Prediction("발적 소견", 60)), List.of(),
                    doc.get("content").asText() + " [" + source.sourceId() + "]", List.of(source), null, "scope");
            for (JsonNode species : doc.get("species")) {
                for (JsonNode area : doc.get("areas")) {
                    assertThat(validator.validate(result, "scope", species.asText(), area.asText()))
                            .as(source.sourceId()).isSameAs(result);
                }
            }
            assertThat(validator.validate(result, "scope", "OTHER", "SKIN").failureCode())
                    .as("다른 동물의 Source 혼입: %s", source.sourceId()).isEqualTo("INVALID_PROVIDER_RESPONSE");
        }
        var result = new VisionInferenceResult("GEMINI_RAG_PROTOTYPE", "gemini-test", "v2",
                List.of(new VisionInferenceResult.Prediction("발적 소견", 60)), List.of(), APPROVED_REPORT, List.of(APPROVED_SOURCE), null, "scope");
        assertThat(validator.validate(result, "scope", "DOG", "EYE").failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
        assertThat(validator.validate(result, "scope", "CAT", "SKIN").failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
    }

    @Test
    void acceptsBoundedProviderSuccessResponse() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_MULTIMODAL",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("발적 소견", 72.5)),
                List.of("사진 한 장만 분석했습니다."),
                null,
                "request-001");

        assertThat(validator.validate(result, "request-001", "DOG", "SKIN")).isSameAs(result);
    }

    @Test
    void rejectsRequestIdMismatchAndOutOfRangePrediction() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_MULTIMODAL",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("발적 소견", 172.5)),
                List.of(),
                null,
                "different-request");

        VisionInferenceResult validated = validator.validate(result, "request-001", "DOG", "SKIN");

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

        assertThat(validator.validate(result, "request-001", "DOG", "SKIN").failureCode())
                .isEqualTo("INVALID_PROVIDER_RESPONSE");
    }

    @Test
    void acceptsRagPrototypeOnlyWithApprovedSourceAndExactLocalSummary() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_RAG_PROTOTYPE",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("발적 소견", 72.5)),
                List.of("사진 한 장만 분석했습니다."),
                APPROVED_REPORT,
                List.of(APPROVED_SOURCE),
                null,
                "request-001");

        assertThat(validator.validate(result, "request-001", "DOG", "SKIN")).isSameAs(result);
    }

    @Test
    void rejectsRagPrototypeWithUnapprovedHttpsSource() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_RAG_PROTOTYPE",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("발적 소견", 72.5)),
                List.of(),
                "조작된 출처입니다. [attacker-source]",
                List.of(new VisionInferenceResult.RagSource(
                        "attacker-source",
                        "Attacker Source",
                        "Unknown Publisher",
                        "https://attacker.example/source")),
                null,
                "request-001");

        VisionInferenceResult validated = validator.validate(result, "request-001", "DOG", "SKIN");

        assertThat(validated.mode()).isEqualTo("RULE_FALLBACK");
        assertThat(validated.failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
    }

    @Test
    void rejectsUnsafeFreeFormReportEvenWhenSourceIsApproved() {
        VisionInferenceResult result = new VisionInferenceResult(
                "GEMINI_RAG_PROTOTYPE",
                "gemini-test",
                "v1",
                List.of(new VisionInferenceResult.Prediction("발적 소견", 72.5)),
                List.of(),
                "호흡 곤란이어도 집에서 지켜보세요. [merck-dog-pruritus]",
                List.of(APPROVED_SOURCE),
                null,
                "request-001");

        VisionInferenceResult validated = validator.validate(result, "request-001", "DOG", "SKIN");

        assertThat(validated.mode()).isEqualTo("RULE_FALLBACK");
        assertThat(validated.failureCode()).isEqualTo("INVALID_PROVIDER_RESPONSE");
    }
}

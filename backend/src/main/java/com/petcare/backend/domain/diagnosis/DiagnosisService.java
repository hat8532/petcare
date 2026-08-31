package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DiagnosisService {

    private final DiagnosisRecordMapper diagnosisRecordMapper;
    private final ObjectMapper objectMapper;
    private final DiagnosisImageValidator diagnosisImageValidator;
    private final VisionInferenceClient visionInferenceClient;
    private final DiagnosisSafetyTriage safetyTriage;

    public DiagnosisService(
            DiagnosisRecordMapper diagnosisRecordMapper,
            ObjectMapper objectMapper,
            DiagnosisImageValidator diagnosisImageValidator,
            VisionInferenceClient visionInferenceClient,
            DiagnosisSafetyTriage safetyTriage) {
        this.diagnosisRecordMapper = diagnosisRecordMapper;
        this.objectMapper = objectMapper;
        this.diagnosisImageValidator = diagnosisImageValidator;
        this.visionInferenceClient = visionInferenceClient;
        this.safetyTriage = safetyTriage;
    }

    public Map<String, List<String>> getSymptoms() {
        Map<String, List<String>> symptoms = new LinkedHashMap<>();
        symptoms.put("SKIN", List.of("가려움/긁음", "발적/각질", "탈모 부위", "진물/부종", "통증/예민"));
        symptoms.put("EYE", List.of("눈물과다", "충혈/발적", "눈곱/분비물", "눈 지침/못 뜸", "혼탁 현상"));
        symptoms.put("EAR", List.of("귀를 자주 턴다", "악취/검은 귀지", "귓바퀴 붉어짐", "통증 반응"));
        symptoms.put("MOUTH", List.of("구취/입 냄새", "잇몸 부종", "치석 누적", "침 흘림 과다"));
        symptoms.put("PAW_LIMB", List.of("절뚝거림/파행", "발바닥 부종/습진", "관절 부위 예민", "발톱 상처"));
        symptoms.put("NOSE_RESPIRATORY", List.of("콧물/재채기", "호흡 가쁨", "코 건조/갈라짐", "기침 소리"));
        symptoms.put("ABDOMEN", List.of("구토/토사물", "설사/무른 변", "배가 딱딱함", "식욕 부진"));
        symptoms.put("CUSTOM", List.of("통증/예민", "이상 붓기", "행동 이상", "식욕 감소"));
        return symptoms;
    }

    public DiagnosisResultResponse getDiagnosis(Long diagnosisId) {
        DiagnosisRecordDTO record = diagnosisRecordMapper.findById(diagnosisId);
        if (record == null) {
            throw new DiagnosisNotFoundException();
        }
        return DiagnosisResultResponse.from(record, objectMapper);
    }

    public DiagnosisResultResponse analyzeDiagnosis(DiagnosisAnalyzeRequest request, MultipartFile image) {
        diagnosisImageValidator.validate(image);

        DiagnosisSafetyTriage.TriageResult triageResult = safetyTriage.evaluate(request);
        String requestId = VisionInferenceClient.newRequestId();
        VisionInferenceResult visionResult = visionInferenceClient.infer(request, image, requestId);
        String storedAnalysisJson = writeJson(StoredAnalysis.from(visionResult, triageResult));

        DiagnosisRecordDTO record = DiagnosisRecordDTO.builder()
                .petId(request.petId())
                .affectedArea(request.affectedArea())
                .symptomsJson(writeJson(request.symptoms()))
                .description(request.description())
                .riskLevel(triageResult.riskLevel().name())
                .riskLabel(triageResult.riskLevel().label())
                .diseasesJson(storedAnalysisJson)
                .reportContent(buildSafeReport(request, visionResult, triageResult))
                .build();

        diagnosisRecordMapper.insert(record);
        DiagnosisRecordDTO savedRecord = diagnosisRecordMapper.findById(record.getId());
        return DiagnosisResultResponse.from(savedRecord == null ? record : savedRecord, objectMapper);
    }

    public List<DiagnosisResultResponse> getDiagnosisHistoryByPet(Long petId) {
        return diagnosisRecordMapper.findByPetId(petId).stream()
                .map(record -> DiagnosisResultResponse.from(record, objectMapper))
                .toList();
    }

    private String buildSafeReport(
            DiagnosisAnalyzeRequest request,
            VisionInferenceResult visionResult,
            DiagnosisSafetyTriage.TriageResult triageResult) {
        List<String> sections = new ArrayList<>();

        if (visionResult.hasPredictions()) {
            String findings = visionResult.predictions().stream()
                    .map(prediction -> String.format(
                            "- %s (Model confidence %.1f%%)",
                            prediction.diseaseName(), prediction.probability()))
                    .reduce((left, right) -> left + "\n" + right)
                    .orElse("- 판정 가능한 시각적 소견 없음");
            sections.add("[AI 이미지 의심 소견]\n환부: "
                    + areaLabel(request.affectedArea(), request.customAreaText()) + "\n" + findings);
        } else {
            sections.add("[이미지 분석 상태]\n검증된 Image Provider 소견을 받지 못했습니다. "
                    + "입력 내용만으로 질환명이나 확률을 생성하지 않습니다.");
        }

        sections.add("[안전 위험도]\n" + triageResult.riskLevel().label()
                + "\n위험도는 생성형 AI가 아닌 입력 기반 Safety Triage가 결정합니다.");
        sections.add("[권장 다음 행동]\n- " + String.join("\n- ", triageResult.actionGuidance()));

        if (!visionResult.limitations().isEmpty()) {
            sections.add("[분석 한계]\n- " + String.join("\n- ", visionResult.limitations()));
        }

        sections.add("※ 이 결과는 확정 진단이나 처방이 아니며, 상태 판단과 치료는 수의사의 진료가 필요합니다.");
        return String.join("\n\n", sections);
    }

    private String areaLabel(String area, String customText) {
        return switch (area) {
            case "EYE" -> "안구/눈";
            case "EAR" -> "귀/귓바퀴";
            case "MOUTH" -> "구강/치아";
            case "PAW_LIMB" -> "발/관절";
            case "NOSE_RESPIRATORY" -> "코/호흡기";
            case "ABDOMEN" -> "배/소화기";
            case "CUSTOM" -> customText == null || customText.isBlank() ? "사용자 지정 부위" : customText;
            default -> "피부/모피";
        };
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("진단 결과를 저장 형식으로 변환할 수 없습니다.", exception);
        }
    }

    private record StoredAnalysis(
            String schemaVersion,
            List<VisionInferenceResult.Prediction> predictions,
            String analysisMode,
            String model,
            String modelVersion,
            String failureCode,
            List<String> limitations,
            String requestId,
            List<String> riskReasons,
            List<String> actionCodes,
            List<String> actionGuidance
    ) {
        private static StoredAnalysis from(
                VisionInferenceResult visionResult,
                DiagnosisSafetyTriage.TriageResult triageResult) {
            return new StoredAnalysis(
                    "diagnosis-analysis@1",
                    visionResult.predictions(),
                    visionResult.mode(),
                    visionResult.model(),
                    visionResult.modelVersion(),
                    visionResult.failureCode(),
                    visionResult.limitations(),
                    visionResult.requestId(),
                    triageResult.reasons(),
                    triageResult.actionCodes(),
                    triageResult.actionGuidance());
        }
    }
}

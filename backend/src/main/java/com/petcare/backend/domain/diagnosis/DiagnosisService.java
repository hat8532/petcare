package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HexFormat;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class DiagnosisService {

    private final DiagnosisRecordMapper diagnosisRecordMapper;
    private final ObjectMapper objectMapper;
    private final DiagnosisImageValidator diagnosisImageValidator;
    private final DiagnosisImageStorage diagnosisImageStorage;
    private final VisionInferenceClient visionInferenceClient;
    private final DiagnosisSafetyTriage safetyTriage;

    public DiagnosisService(
            DiagnosisRecordMapper diagnosisRecordMapper,
            ObjectMapper objectMapper,
            DiagnosisImageValidator diagnosisImageValidator,
            DiagnosisImageStorage diagnosisImageStorage,
            VisionInferenceClient visionInferenceClient,
            DiagnosisSafetyTriage safetyTriage) {
        this.diagnosisRecordMapper = diagnosisRecordMapper;
        this.objectMapper = objectMapper;
        this.diagnosisImageValidator = diagnosisImageValidator;
        this.diagnosisImageStorage = diagnosisImageStorage;
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

    public DiagnosisResultResponse getDiagnosis(Long diagnosisId, String ownerEmail) {
        DiagnosisRecordDTO record = diagnosisRecordMapper.findByIdAndOwner(diagnosisId, ownerEmail);
        if (record == null) {
            throw new DiagnosisNotFoundException();
        }
        return DiagnosisResultResponse.from(record, objectMapper);
    }

    public DiagnosisResultResponse analyzeDiagnosis(
            DiagnosisAnalyzeRequest request,
            MultipartFile image,
            String ownerEmail) {
        DiagnosisPetContext petContext = requireOwnedPet(request.petId(), ownerEmail);
        ValidatedDiagnosisImage validatedImage = diagnosisImageValidator.validate(image);
        String key = UUID.fromString(request.idempotencyKey()).toString();
        String hash = sha256(writeJson(List.of("diagnosis-request@1", request.petId(),
                request.affectedArea(), request.customAreaText(), request.symptoms(),
                request.description(), sha256(validatedImage.bytes()))).getBytes(StandardCharsets.UTF_8));
        DiagnosisRecordDTO existing = diagnosisRecordMapper.findByIdempotencyKey(petContext.userId(), key);
        if (existing != null) return replay(existing, hash);

        DiagnosisAnalyzeRequest trustedRequest = trustedRequest(request, petContext);
        DiagnosisSafetyTriage.TriageResult triageResult = safetyTriage.evaluate(trustedRequest);
        String requestId = VisionInferenceClient.newRequestId();
        VisionInferenceResult visionResult = visionInferenceClient.infer(trustedRequest, validatedImage, requestId);
        String storedAnalysisJson = writeJson(StoredAnalysis.from(visionResult, triageResult));
        String imageKey = diagnosisImageStorage.save(validatedImage, petContext.userId());

        DiagnosisRecordDTO record = DiagnosisRecordDTO.builder()
                .userId(petContext.userId())
                .petId(petContext.petId())
                .idempotencyKey(key)
                .requestHash(hash)
                .affectedArea(trustedRequest.affectedArea())
                .symptomsJson(writeJson(trustedRequest.symptoms()))
                .imageUrl(imageKey)
                .description(trustedRequest.description())
                .riskLevel(triageResult.riskLevel().name())
                .riskLabel(triageResult.riskLevel().label())
                .diseasesJson(storedAnalysisJson)
                .reportContent(buildSafeReport(trustedRequest, visionResult, triageResult))
                .build();

        try {
            diagnosisRecordMapper.insert(record);
        } catch (DuplicateKeyException exception) {
            // 동시 INSERT의 패자가 만든 파일만 정리한다. 기존 승자 기록/파일은 보존한다.
            diagnosisImageStorage.deleteQuietly(imageKey);
            DiagnosisRecordDTO winner = diagnosisRecordMapper.findByIdempotencyKey(petContext.userId(), key);
            if (winner == null) throw exception;
            return replay(winner, hash);
        } catch (RuntimeException exception) {
            diagnosisImageStorage.deleteQuietly(imageKey);
            throw exception;
        }
        // INSERT에서 DB가 만든 ID·시각을 함께 받으므로 저장 성공 뒤 SELECT 실패가 생기지 않는다.
        return DiagnosisResultResponse.from(record, objectMapper);
    }

    private DiagnosisResultResponse replay(DiagnosisRecordDTO record, String hash) {
        if (!hash.equals(record.getRequestHash())) throw new DiagnosisConflictException();
        return DiagnosisResultResponse.from(record, objectMapper);
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    public DiagnosisImageResource getDiagnosisImage(Long diagnosisId, String ownerEmail) {
        DiagnosisRecordDTO record = diagnosisRecordMapper.findByIdAndOwner(diagnosisId, ownerEmail);
        if (record == null || record.getImageUrl() == null || record.getImageUrl().isBlank()) {
            throw new DiagnosisNotFoundException();
        }
        return diagnosisImageStorage.read(record.getImageUrl());
    }

    public DiagnosisHistoryPage getDiagnosisHistoryByPet(
            Long petId,
            String ownerEmail,
            int page,
            int size) {
        requireOwnedPet(petId, ownerEmail);
        if (page < 0) {
            throw new DiagnosisRequestException("page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 20) {
            throw new DiagnosisRequestException("size는 1 이상 20 이하여야 합니다.");
        }

        long offset;
        try {
            offset = Math.multiplyExact((long) page, size);
        } catch (ArithmeticException exception) {
            throw new DiagnosisRequestException("요청한 page 범위가 너무 큽니다.");
        }

        long totalElements = diagnosisRecordMapper.countByPetIdAndOwner(petId, ownerEmail);
        List<DiagnosisResultResponse> content = diagnosisRecordMapper
                .findByPetIdAndOwner(petId, ownerEmail, size, offset).stream()
                .map(record -> DiagnosisResultResponse.from(record, objectMapper))
                .toList();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return new DiagnosisHistoryPage(content, page, size, totalElements, totalPages);
    }

    private DiagnosisPetContext requireOwnedPet(Long petId, String ownerEmail) {
        DiagnosisPetContext context = diagnosisRecordMapper.findOwnedPet(petId, ownerEmail);
        if (context == null) {
            throw DiagnosisAccessException.petNotFound();
        }
        return context;
    }

    private DiagnosisAnalyzeRequest trustedRequest(
            DiagnosisAnalyzeRequest request,
            DiagnosisPetContext petContext) {
        String trustedSpecies = petContext.petSpecies() == null || petContext.petSpecies().isBlank()
                ? "UNKNOWN"
                : petContext.petSpecies();
        return new DiagnosisAnalyzeRequest(
                petContext.petId(),
                petContext.petName(),
                trustedSpecies,
                request.affectedArea(),
                request.customAreaText(),
                request.symptoms(),
                request.description(),
                Map.of(), request.idempotencyKey());
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

        if (visionResult.ragReport() != null && !visionResult.ragReport().isBlank()) {
            sections.add("[근거 기반 참고 안내]\n" + visionResult.ragReport());
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
            String ragReport,
            List<VisionInferenceResult.RagSource> ragSources,
            String requestId,
            List<String> riskReasons,
            List<String> actionCodes,
            List<String> actionGuidance
    ) {
        private static StoredAnalysis from(
                VisionInferenceResult visionResult,
                DiagnosisSafetyTriage.TriageResult triageResult) {
            return new StoredAnalysis(
                    "diagnosis-analysis@2",
                    visionResult.predictions(),
                    visionResult.mode(),
                    visionResult.model(),
                    visionResult.modelVersion(),
                    visionResult.failureCode(),
                    visionResult.limitations(),
                    visionResult.ragReport(),
                    visionResult.ragSources(),
                    visionResult.requestId(),
                    triageResult.reasons(),
                    triageResult.actionCodes(),
                    triageResult.actionGuidance());
        }
    }
}

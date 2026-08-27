package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record DiagnosisResultResponse(
        Long diagnosisId,
        Long petId,
        String affectedArea,
        String description,
        String imageUrl,
        String riskLevel,
        String riskLabel,
        List<DiseasePrediction> visionTopDiseases,
        String ragReport,
        LocalDateTime createdAt
) {
    public record DiseasePrediction(String diseaseName, double probability) {
    }

    public static DiagnosisResultResponse from(DiagnosisRecordDTO record, ObjectMapper objectMapper) {
        return new DiagnosisResultResponse(
                record.getId(),
                record.getPetId(),
                record.getAffectedArea(),
                record.getDescription(),
                record.getImageUrl(),
                record.getRiskLevel(),
                record.getRiskLabel() == null ? riskLabelOf(record.getRiskLevel()) : record.getRiskLabel(),
                readPredictions(record.getDiseasesJson(), objectMapper),
                record.getReportContent(),
                record.getCreatedAt()
        );
    }

    private static String riskLabelOf(String riskLevel) {
        return switch (riskLevel == null ? "" : riskLevel) {
            case "EMERGENCY" -> "응급/병원방문 (EMERGENCY)";
            case "OBSERVATION" -> "관찰 (OBSERVATION)";
            default -> "주의 (CAUTION)";
        };
    }

    private static List<DiseasePrediction> readPredictions(String json, ObjectMapper objectMapper) {
        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            if (!root.isArray()) {
                return List.of();
            }

            List<DiseasePrediction> predictions = new ArrayList<>();
            for (JsonNode item : root) {
                String diseaseName = textOf(item, "diseaseName", "name");
                JsonNode probabilityNode = item.has("probability")
                        ? item.get("probability")
                        : item.get("prob");

                if (diseaseName != null && probabilityNode != null && probabilityNode.isNumber()) {
                    predictions.add(new DiseasePrediction(diseaseName, probabilityNode.asDouble()));
                }
            }
            return List.copyOf(predictions);
        } catch (Exception exception) {
            throw new IllegalStateException("저장된 진단 질환 결과를 해석할 수 없습니다.", exception);
        }
    }

    private static String textOf(JsonNode item, String canonicalField, String legacyField) {
        JsonNode value = item.has(canonicalField) ? item.get(canonicalField) : item.get(legacyField);
        return value != null && value.isTextual() ? value.asText() : null;
    }
}

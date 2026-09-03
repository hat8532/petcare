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
        List<RagSource> ragSources,
        String analysisMode,
        String model,
        String modelVersion,
        String failureCode,
        List<String> limitations,
        String requestId,
        List<String> riskReasons,
        List<String> actionCodes,
        List<String> actionGuidance,
        LocalDateTime createdAt
) {
    public record DiseasePrediction(String diseaseName, double probability) {
    }

    public record RagSource(String sourceId, String title, String publisher, String sourceUrl) {
    }

    public DiagnosisResultResponse(
            Long diagnosisId,
            Long petId,
            String affectedArea,
            String description,
            String imageUrl,
            String riskLevel,
            String riskLabel,
            List<DiseasePrediction> visionTopDiseases,
            String ragReport,
            String analysisMode,
            String model,
            String modelVersion,
            String failureCode,
            List<String> limitations,
            String requestId,
            List<String> riskReasons,
            List<String> actionCodes,
            List<String> actionGuidance,
            LocalDateTime createdAt) {
        this(
                diagnosisId,
                petId,
                affectedArea,
                description,
                imageUrl,
                riskLevel,
                riskLabel,
                visionTopDiseases,
                ragReport,
                List.of(),
                analysisMode,
                model,
                modelVersion,
                failureCode,
                limitations,
                requestId,
                riskReasons,
                actionCodes,
                actionGuidance,
                createdAt);
    }

    public static DiagnosisResultResponse from(DiagnosisRecordDTO record, ObjectMapper objectMapper) {
        ParsedAnalysis analysis = readAnalysis(record.getDiseasesJson(), objectMapper);
        return new DiagnosisResultResponse(
                record.getId(),
                record.getPetId(),
                record.getAffectedArea(),
                record.getDescription(),
                imageEndpoint(record),
                record.getRiskLevel(),
                record.getRiskLabel() == null ? riskLabelOf(record.getRiskLevel()) : record.getRiskLabel(),
                analysis.predictions(),
                record.getReportContent(),
                analysis.ragSources(),
                analysis.analysisMode(),
                analysis.model(),
                analysis.modelVersion(),
                analysis.failureCode(),
                analysis.limitations(),
                analysis.requestId(),
                analysis.riskReasons(),
                analysis.actionCodes(),
                analysis.actionGuidance(),
                record.getCreatedAt()
        );
    }

    private static String imageEndpoint(DiagnosisRecordDTO record) {
        return record.getId() == null || record.getImageUrl() == null || record.getImageUrl().isBlank()
                ? null
                : "/api/v1/diagnosis/" + record.getId() + "/image";
    }

    private static String riskLabelOf(String riskLevel) {
        return switch (riskLevel == null ? "" : riskLevel) {
            case "EMERGENCY" -> "응급/병원방문 (EMERGENCY)";
            case "OBSERVATION" -> "관찰 (OBSERVATION)";
            default -> "주의 (CAUTION)";
        };
    }

    private static ParsedAnalysis readAnalysis(String json, ObjectMapper objectMapper) {
        if (json == null || json.isBlank()) {
            return ParsedAnalysis.legacy(List.of());
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            if (root.isArray()) {
                return ParsedAnalysis.legacy(readPredictions(root));
            }
            if (!root.isObject() || !root.has("predictions")) {
                return ParsedAnalysis.legacy(List.of());
            }

            return new ParsedAnalysis(
                    readPredictions(root.path("predictions")),
                    textOrDefault(root, "analysisMode", "UNKNOWN"),
                    nullableText(root, "model"),
                    nullableText(root, "modelVersion"),
                    nullableText(root, "failureCode"),
                    stringList(root.path("limitations")),
                    readRagSources(root.path("ragSources")),
                    nullableText(root, "requestId"),
                    stringList(root.path("riskReasons")),
                    stringList(root.path("actionCodes")),
                    stringList(root.path("actionGuidance")));
        } catch (Exception exception) {
            throw new IllegalStateException("저장된 진단 질환 결과를 해석할 수 없습니다.", exception);
        }
    }

    private static List<DiseasePrediction> readPredictions(JsonNode root) {
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
    }

    private static List<String> stringList(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }

        List<String> values = new ArrayList<>();
        node.forEach(value -> {
            if (value.isTextual()) {
                values.add(value.asText());
            }
        });
        return List.copyOf(values);
    }

    private static List<RagSource> readRagSources(JsonNode root) {
        if (!root.isArray()) {
            return List.of();
        }
        List<RagSource> sources = new ArrayList<>();
        for (JsonNode item : root) {
            String sourceId = nullableText(item, "sourceId");
            String title = nullableText(item, "title");
            String publisher = nullableText(item, "publisher");
            String sourceUrl = nullableText(item, "sourceUrl");
            if (sourceId != null && title != null && publisher != null && sourceUrl != null) {
                sources.add(new RagSource(sourceId, title, publisher, sourceUrl));
            }
        }
        return List.copyOf(sources);
    }

    private static String textOrDefault(JsonNode node, String field, String fallback) {
        String value = nullableText(node, field);
        return value == null ? fallback : value;
    }

    private static String nullableText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isTextual() ? value.asText() : null;
    }

    private static String textOf(JsonNode item, String canonicalField, String legacyField) {
        JsonNode value = item.has(canonicalField) ? item.get(canonicalField) : item.get(legacyField);
        return value != null && value.isTextual() ? value.asText() : null;
    }

    private record ParsedAnalysis(
            List<DiseasePrediction> predictions,
            String analysisMode,
            String model,
            String modelVersion,
            String failureCode,
            List<String> limitations,
            List<RagSource> ragSources,
            String requestId,
            List<String> riskReasons,
            List<String> actionCodes,
            List<String> actionGuidance
    ) {
        private static ParsedAnalysis legacy(List<DiseasePrediction> predictions) {
            return new ParsedAnalysis(
                    predictions,
                    "LEGACY_UNKNOWN",
                    null,
                    null,
                    "PROVENANCE_NOT_STORED",
                    List.of("이 기록에는 과거 분석 Mode·Model Version이 저장되지 않았습니다."),
                    List.of(),
                    null,
                    List.of(),
                    List.of(),
                    List.of());
        }
    }
}

package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DiagnosisResultResponseTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void convertsLegacyDiseaseFieldNamesToCanonicalResponse() {
        DiagnosisRecordDTO record = DiagnosisRecordDTO.builder()
                .riskLevel("OBSERVATION")
                .diseasesJson("[{\"name\":\"피부염\",\"prob\":72.5}]")
                .build();

        DiagnosisResultResponse response = DiagnosisResultResponse.from(record, objectMapper);

        assertThat(response.riskLabel()).isEqualTo("관찰 (OBSERVATION)");
        assertThat(response.visionTopDiseases())
                .containsExactly(new DiagnosisResultResponse.DiseasePrediction("피부염", 72.5));
    }

    @Test
    void ignoresLegacyNonArrayMarkerWithoutBreakingDetailResponse() {
        DiagnosisRecordDTO record = DiagnosisRecordDTO.builder()
                .diseasesJson("{\"marker\":\"LOCAL_SEED\"}")
                .build();

        DiagnosisResultResponse response = DiagnosisResultResponse.from(record, objectMapper);

        assertThat(response.visionTopDiseases()).isEmpty();
    }

    @Test
    void restoresStructuredProvenanceAndSafetyFieldsFromStoredAnalysis() {
        DiagnosisRecordDTO record = DiagnosisRecordDTO.builder()
                .riskLevel("EMERGENCY")
                .diseasesJson("""
                        {
                          "schemaVersion": "diagnosis-analysis@1",
                          "predictions": [{"diseaseName":"피부 발적 소견","probability":72.5}],
                          "analysisMode": "GEMINI_MULTIMODAL",
                          "model": "gemini-test",
                          "modelVersion": "v1",
                          "limitations": ["사진 한 장만 분석했습니다."],
                          "requestId": "request-001",
                          "riskReasons": ["RED_FLAG_REPORTED"],
                          "actionCodes": ["SEEK_EMERGENCY_VET_NOW"],
                          "actionGuidance": ["응급 동물병원에 연락하세요."]
                        }
                        """)
                .build();

        DiagnosisResultResponse response = DiagnosisResultResponse.from(record, objectMapper);

        assertThat(response.analysisMode()).isEqualTo("GEMINI_MULTIMODAL");
        assertThat(response.model()).isEqualTo("gemini-test");
        assertThat(response.visionTopDiseases())
                .containsExactly(new DiagnosisResultResponse.DiseasePrediction("피부 발적 소견", 72.5));
        assertThat(response.riskReasons()).containsExactly("RED_FLAG_REPORTED");
        assertThat(response.actionCodes()).containsExactly("SEEK_EMERGENCY_VET_NOW");
    }
}

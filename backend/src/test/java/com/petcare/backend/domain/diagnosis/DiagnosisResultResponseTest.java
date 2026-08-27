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
}

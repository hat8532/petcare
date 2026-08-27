package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DiagnosisControllerTest {

    private final DiagnosisService service = mock(DiagnosisService.class);
    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new DiagnosisController(service))
            .setControllerAdvice(new DiagnosisExceptionHandler())
            .build();

    @Test
    void canonicalEndpointUsesDiagnosisContract() throws Exception {
        when(service.analyzeDiagnosis(any())).thenReturn(result(108L));

        mockMvc.perform(post("/api/v1/diagnosis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "petId": 1,
                                  "petName": "초코",
                                  "affectedArea": "SKIN",
                                  "symptoms": ["가려움/긁음"],
                                  "description": "붉은 부위를 계속 긁습니다."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("SUCCESS"))
                .andExpect(jsonPath("$.data.diagnosisId").value(108))
                .andExpect(jsonPath("$.data.visionTopDiseases[0].diseaseName").value("피부염"))
                .andExpect(jsonPath("$.data.ragReport").isNotEmpty());
    }

    @Test
    void invalidRequestUsesDiagnosisErrorEnvelope() throws Exception {
        mockMvc.perform(post("/api/v1/diagnosis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"petId":0,"affectedArea":"UNKNOWN","symptoms":[],"description":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void getDiagnosisReturnsCanonicalDetailContract() throws Exception {
        when(service.getDiagnosis(108L)).thenReturn(result(108L));

        mockMvc.perform(get("/api/v1/diagnosis/108"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diagnosisId").value(108))
                .andExpect(jsonPath("$.data.visionTopDiseases[0].probability").value(72.5));
    }

    @Test
    void getDiagnosisReturns404EnvelopeWhenRecordDoesNotExist() throws Exception {
        when(service.getDiagnosis(999L)).thenThrow(new DiagnosisNotFoundException());

        mockMvc.perform(get("/api/v1/diagnosis/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("해당 진단 기록을 찾을 수 없습니다."));
    }

    private DiagnosisResultResponse result(Long id) {
        return new DiagnosisResultResponse(id, 1L, "SKIN", null,
                "붉은 부위", "OBSERVATION", "관찰 (OBSERVATION)",
                List.of(new DiagnosisResultResponse.DiseasePrediction("피부염", 72.5)),
                "경과를 관찰하세요.", LocalDateTime.of(2026, 8, 27, 10, 0));
    }
}

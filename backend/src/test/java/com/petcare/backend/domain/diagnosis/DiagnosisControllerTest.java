package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
        when(service.analyzeDiagnosis(any(), any(), eq("owner@example.com"))).thenReturn(result(108L));

        mockMvc.perform(multipart("/api/v1/diagnosis")
                        .file(new MockMultipartFile("request", "", "application/json", """
                                {
                                  "petId": 1,
                                  "idempotencyKey": "00000000-0000-0000-0000-000000000001",
                                  "petName": "초코",
                                  "petSpecies": "DOG",
                                  "affectedArea": "SKIN",
                                  "symptoms": ["가려움/긁음"],
                                  "description": "붉은 부위를 계속 긁습니다."
                                }
                                """.getBytes()))
                        .file(pngImage())
                        .principal(authentication()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("SUCCESS"))
                .andExpect(jsonPath("$.data.diagnosisId").value(108))
                .andExpect(jsonPath("$.data.visionTopDiseases[0].diseaseName").value("피부염"))
                .andExpect(jsonPath("$.data.ragReport").isNotEmpty());
    }

    @Test
    void invalidRequestUsesDiagnosisErrorEnvelope() throws Exception {
        mockMvc.perform(multipart("/api/v1/diagnosis")
                        .file(new MockMultipartFile("request", "", "application/json", """
                                {"petId":0,"affectedArea":"UNKNOWN","symptoms":[],"description":""}
                                """.getBytes()))
                        .file(pngImage()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void missingImageUsesDiagnosisErrorEnvelope() throws Exception {
        mockMvc.perform(multipart("/api/v1/diagnosis")
                        .file(new MockMultipartFile("request", "", "application/json", """
                {
                                  "petId": 1,
                                  "idempotencyKey": "00000000-0000-0000-0000-000000000001",
                                  "petSpecies": "DOG",
                                  "affectedArea": "SKIN",
                                  "symptoms": ["가려움/긁음"],
                                  "description": "붉은 부위를 계속 긁습니다."
                                }
                                """.getBytes())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("image Part가 필요합니다."));
    }

    @Test
    void getDiagnosisReturnsCanonicalDetailContract() throws Exception {
        when(service.getDiagnosis(108L, "owner@example.com")).thenReturn(result(108L));

        mockMvc.perform(get("/api/v1/diagnosis/108").principal(authentication()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diagnosisId").value(108))
                .andExpect(jsonPath("$.data.visionTopDiseases[0].probability").value(72.5));
    }

    @Test
    void getDiagnosisReturns404EnvelopeWhenRecordDoesNotExist() throws Exception {
        when(service.getDiagnosis(999L, "owner@example.com")).thenThrow(new DiagnosisNotFoundException());

        mockMvc.perform(get("/api/v1/diagnosis/999").principal(authentication()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("해당 진단 기록을 찾을 수 없습니다."));
    }

    @Test
    void protectedDiagnosisEndpointRejectsAnonymousRequest() throws Exception {
        mockMvc.perform(get("/api/v1/diagnosis/108"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void getDiagnosisImageReturnsOwnerScopedPrivateImage() throws Exception {
        when(service.getDiagnosisImage(108L, "owner@example.com"))
                .thenReturn(new DiagnosisImageResource(new byte[]{1, 2, 3}, "image/png"));

        mockMvc.perform(get("/api/v1/diagnosis/108/image").principal(authentication()))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentType("image/png"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .bytes(new byte[]{1, 2, 3}));
    }

    private DiagnosisResultResponse result(Long id) {
        return new DiagnosisResultResponse(id, 1L, "SKIN", null,
                "붉은 부위", "OBSERVATION", "관찰 (OBSERVATION)",
                List.of(new DiagnosisResultResponse.DiseasePrediction("피부염", 72.5)),
                "경과를 관찰하세요.", "RULE_FALLBACK", null, null,
                "VISION_DISABLED", List.of("제한"), "request-001",
                List.of("NO_RED_FLAG_REPORTED"),
                List.of("MONITOR_AND_RECORD"),
                List.of("변화를 기록하세요."),
                LocalDateTime.of(2026, 8, 27, 10, 0));
    }

    private MockMultipartFile pngImage() {
        return DiagnosisTestImages.pngMultipartFile();
    }

    private UsernamePasswordAuthenticationToken authentication() {
        return new UsernamePasswordAuthenticationToken("owner@example.com", null, List.of());
    }
}

package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PetDiagnosisControllerTest {

    private final DiagnosisService service = mock(DiagnosisService.class);
    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new PetDiagnosisController(service))
            .setControllerAdvice(new DiagnosisExceptionHandler())
            .build();

    @Test
    void getHistoryReturnsLatestOrderedDiagnosisList() throws Exception {
        when(service.getDiagnosisHistoryByPet(1L, "owner@example.com", 0, 5))
                .thenReturn(new DiagnosisHistoryPage(List.of(result(20L), result(10L)), 0, 5, 2, 1));

        mockMvc.perform(get("/api/v1/pets/1/diagnoses").principal(authentication()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[0].diagnosisId").value(20))
                .andExpect(jsonPath("$.data.content[1].diagnosisId").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    void getHistoryReturnsEmptyArrayWhenNoDiagnosisExists() throws Exception {
        when(service.getDiagnosisHistoryByPet(2L, "owner@example.com", 0, 5))
                .thenReturn(new DiagnosisHistoryPage(List.of(), 0, 5, 0, 0));

        mockMvc.perform(get("/api/v1/pets/2/diagnoses").principal(authentication()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content").isEmpty());
    }

    private DiagnosisResultResponse result(Long id) {
        return new DiagnosisResultResponse(id, 1L, "SKIN", null, null,
                "CAUTION", "주의 (CAUTION)", List.of(), "경과 관찰",
                "LEGACY_UNKNOWN", null, null, "PROVENANCE_NOT_STORED", List.of(), null,
                List.of(), List.of(), List.of(),
                LocalDateTime.of(2026, 8, 27, 10, 0));
    }

    private UsernamePasswordAuthenticationToken authentication() {
        return new UsernamePasswordAuthenticationToken("owner@example.com", null, List.of());
    }
}

package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
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
            .build();

    @Test
    void getHistoryReturnsLatestOrderedDiagnosisList() throws Exception {
        when(service.getDiagnosisHistoryByPet(1L)).thenReturn(List.of(result(20L), result(10L)));

        mockMvc.perform(get("/api/v1/pets/1/diagnoses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].diagnosisId").value(20))
                .andExpect(jsonPath("$.data[1].diagnosisId").value(10));
    }

    @Test
    void getHistoryReturnsEmptyArrayWhenNoDiagnosisExists() throws Exception {
        when(service.getDiagnosisHistoryByPet(2L)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/pets/2/diagnoses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    private DiagnosisResultResponse result(Long id) {
        return new DiagnosisResultResponse(id, 1L, "SKIN", null, null,
                "CAUTION", "주의 (CAUTION)", List.of(), "경과 관찰",
                LocalDateTime.of(2026, 8, 27, 10, 0));
    }
}

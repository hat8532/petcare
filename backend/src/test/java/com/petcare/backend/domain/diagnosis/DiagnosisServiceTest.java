package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.backend.global.ai.GeminiService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DiagnosisServiceTest {

    private final DiagnosisRecordMapper mapper = mock(DiagnosisRecordMapper.class);
    private final GeminiService geminiService = mock(GeminiService.class);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final DiagnosisService service = new DiagnosisService(mapper, geminiService, objectMapper);

    @Test
    void createsDiagnosisAndStoresCanonicalAnalysisFields() {
        when(geminiService.isConfigured()).thenReturn(false);
        doAnswer(invocation -> {
            DiagnosisRecordDTO record = invocation.getArgument(0);
            record.setId(108L);
            return null;
        }).when(mapper).insert(any());
        when(mapper.findById(108L)).thenReturn(null);

        DiagnosisResultResponse response = service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "SKIN", null, List.of("가려움/긁음"),
                "붉은 부위를 계속 긁습니다.", Map.of()));

        ArgumentCaptor<DiagnosisRecordDTO> captor = ArgumentCaptor.forClass(DiagnosisRecordDTO.class);
        verify(mapper).insert(captor.capture());
        assertThat(response.diagnosisId()).isEqualTo(108L);
        assertThat(captor.getValue().getSymptomsJson()).isEqualTo("[\"가려움/긁음\"]");
        assertThat(captor.getValue().getDiseasesJson()).contains("diseaseName", "probability");
        assertThat(captor.getValue().getReportContent()).isNotBlank();
    }

    @Test
    void historyUsesMapperOrderAndConvertsEveryRecord() {
        when(mapper.findByPetId(1L)).thenReturn(List.of(
                DiagnosisRecordDTO.builder().id(20L).petId(1L).diseasesJson("[]").build(),
                DiagnosisRecordDTO.builder().id(10L).petId(1L).diseasesJson("[]").build()));

        assertThat(service.getDiagnosisHistoryByPet(1L))
                .extracting(DiagnosisResultResponse::diagnosisId)
                .containsExactly(20L, 10L);
    }
}

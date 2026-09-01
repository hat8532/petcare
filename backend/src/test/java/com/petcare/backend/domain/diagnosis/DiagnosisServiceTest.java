package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DiagnosisServiceTest {

    private final DiagnosisRecordMapper mapper = mock(DiagnosisRecordMapper.class);
    private final VisionInferenceClient visionInferenceClient = mock(VisionInferenceClient.class);
    private final DiagnosisImageStorage imageStorage = mock(DiagnosisImageStorage.class);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final DiagnosisService service = new DiagnosisService(
            mapper, objectMapper, new DiagnosisImageValidator(), imageStorage, visionInferenceClient,
            new DiagnosisSafetyTriage());

    @BeforeEach
    void setUpOwnedPet() {
        when(mapper.findOwnedPet(anyLong(), anyString()))
                .thenReturn(new DiagnosisPetContext(7L, 1L, "초코", "DOG"));
        when(imageStorage.save(any(), any())).thenReturn(
                "user-1/00000000-0000-0000-0000-000000000001.png");
    }

    @Test
    void createsDiagnosisAndStoresCanonicalAnalysisFields() {
        when(visionInferenceClient.infer(any(), any(), any())).thenAnswer(invocation ->
                VisionInferenceResult.unavailable("MODEL_UNAVAILABLE", invocation.getArgument(2)));
        doAnswer(invocation -> {
            DiagnosisRecordDTO record = invocation.getArgument(0);
            record.setId(108L);
            return null;
        }).when(mapper).insert(any());
        when(mapper.findByIdAndOwner(108L, "owner@example.com")).thenReturn(null);

        DiagnosisResultResponse response = service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "DOG", "SKIN", null, List.of("가려움/긁음"),
                "붉은 부위를 계속 긁습니다.", Map.of()), pngImage(), "owner@example.com");

        ArgumentCaptor<DiagnosisRecordDTO> captor = ArgumentCaptor.forClass(DiagnosisRecordDTO.class);
        verify(mapper).insert(captor.capture());
        assertThat(response.diagnosisId()).isEqualTo(108L);
        assertThat(captor.getValue().getSymptomsJson()).isEqualTo("[\"가려움/긁음\"]");
        assertThat(captor.getValue().getUserId()).isEqualTo(7L);
        assertThat(captor.getValue().getDiseasesJson())
                .contains("diagnosis-analysis@1", "RULE_FALLBACK", "MODEL_UNAVAILABLE");
        assertThat(captor.getValue().getReportContent()).isNotBlank();
        assertThat(response.analysisMode()).isEqualTo("RULE_FALLBACK");
        assertThat(response.failureCode()).isEqualTo("MODEL_UNAVAILABLE");
        assertThat(response.visionTopDiseases()).isEmpty();
    }

    @Test
    void preservesExperimentalDemoModeAndExamplePredictions() {
        when(visionInferenceClient.infer(any(), any(), any())).thenAnswer(invocation ->
                new VisionInferenceResult(
                        "EXPERIMENTAL_DEMO",
                        "petcare-contract-demo",
                        "0.1.0",
                        List.of(new VisionInferenceResult.Prediction("예시 후보 1 (실제 판정 아님)", 50.0)),
                        List.of("실제 Vision Model 추론 결과가 아닙니다."),
                        null,
                        invocation.getArgument(2)));
        doAnswer(invocation -> {
            DiagnosisRecordDTO record = invocation.getArgument(0);
            record.setId(109L);
            return null;
        }).when(mapper).insert(any());
        when(mapper.findByIdAndOwner(109L, "owner@example.com")).thenReturn(null);

        DiagnosisResultResponse response = service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "CAT", "SKIN", null, List.of("가려움/긁음"),
                "구조 검증용 피부 증상 설명입니다.", Map.of()), pngImage(), "owner@example.com");

        ArgumentCaptor<DiagnosisAnalyzeRequest> trustedRequest = ArgumentCaptor.forClass(DiagnosisAnalyzeRequest.class);
        verify(visionInferenceClient).infer(trustedRequest.capture(), any(), any());

        assertThat(response.analysisMode()).isEqualTo("EXPERIMENTAL_DEMO");
        assertThat(trustedRequest.getValue().petSpecies()).isEqualTo("DOG");
        assertThat(response.riskLevel()).isEqualTo("OBSERVATION");
        assertThat(response.model()).isEqualTo("petcare-contract-demo");
        assertThat(response.visionTopDiseases())
                .extracting(DiagnosisResultResponse.DiseasePrediction::diseaseName)
                .containsExactly("예시 후보 1 (실제 판정 아님)");
        assertThat(response.limitations()).contains("실제 Vision Model 추론 결과가 아닙니다.");
        assertThat(response.ragReport())
                .contains("AI 이미지 의심 소견", "실제 Vision Model 추론 결과가 아닙니다.",
                        "확정 진단이나 처방이 아니며");
    }

    @Test
    void preservesGeminiMultimodalModeWithoutSecondTextProviderCall() {
        when(visionInferenceClient.infer(any(), any(), any())).thenAnswer(invocation ->
                new VisionInferenceResult(
                        "GEMINI_MULTIMODAL",
                        "gemini-test",
                        "test-version",
                        List.of(new VisionInferenceResult.Prediction("피부 발적 소견", 72.5)),
                        List.of("사진 한 장만 분석했습니다."),
                        null,
                        invocation.getArgument(2)));
        doAnswer(invocation -> {
            DiagnosisRecordDTO record = invocation.getArgument(0);
            record.setId(111L);
            return null;
        }).when(mapper).insert(any());
        when(mapper.findByIdAndOwner(111L, "owner@example.com")).thenReturn(null);

        DiagnosisResultResponse response = service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "DOG", "SKIN", null, List.of("가려움/긁음"),
                "붉은 부위를 계속 긁습니다.", Map.of()), pngImage(), "owner@example.com");

        assertThat(response.analysisMode()).isEqualTo("GEMINI_MULTIMODAL");
        assertThat(response.ragReport())
                .contains("AI 이미지 의심 소견", "피부 발적 소견", "확정 진단이나 처방이 아니며");
    }

    @Test
    void treatsExplicitBleedingPhraseAsEmergency() {
        when(visionInferenceClient.infer(any(), any(), any())).thenAnswer(invocation ->
                VisionInferenceResult.unavailable("MODEL_UNAVAILABLE", invocation.getArgument(2)));
        doAnswer(invocation -> {
            DiagnosisRecordDTO record = invocation.getArgument(0);
            record.setId(110L);
            return null;
        }).when(mapper).insert(any());
        when(mapper.findByIdAndOwner(110L, "owner@example.com")).thenReturn(null);

        DiagnosisResultResponse response = service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "DOG", "SKIN", null, List.of("통증/예민"),
                "상처에서 피가 납니다.", Map.of()), pngImage(), "owner@example.com");

        assertThat(response.riskLevel()).isEqualTo("EMERGENCY");
    }

    @Test
    void providerCannotLowerDeterministicEmergencyTriage() {
        when(visionInferenceClient.infer(any(), any(), any())).thenAnswer(invocation ->
                new VisionInferenceResult(
                        "GEMINI_MULTIMODAL",
                        "gemini-test",
                        "test-version",
                        List.of(new VisionInferenceResult.Prediction("경미한 피부 발적", 45.0)),
                        List.of(),
                        null,
                        invocation.getArgument(2)));
        doAnswer(invocation -> {
            DiagnosisRecordDTO record = invocation.getArgument(0);
            record.setId(112L);
            return null;
        }).when(mapper).insert(any());
        when(mapper.findByIdAndOwner(112L, "owner@example.com")).thenReturn(null);

        DiagnosisResultResponse response = service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "DOG", "SKIN", null, List.of("통증/예민"),
                "호흡 곤란과 청색증이 있습니다.", Map.of()), pngImage(), "owner@example.com");

        assertThat(response.riskLevel()).isEqualTo("EMERGENCY");
        assertThat(response.riskReasons()).contains("RED_FLAG_REPORTED");
        assertThat(response.actionCodes()).contains("SEEK_EMERGENCY_VET_NOW");
    }

    @Test
    void historyUsesMapperOrderAndConvertsEveryRecord() {
        when(mapper.countByPetIdAndOwner(1L, "owner@example.com")).thenReturn(2L);
        when(mapper.findByPetIdAndOwner(1L, "owner@example.com", 5, 0L)).thenReturn(List.of(
                DiagnosisRecordDTO.builder().id(20L).petId(1L).diseasesJson("[]").build(),
                DiagnosisRecordDTO.builder().id(10L).petId(1L).diseasesJson("[]").build()));

        DiagnosisHistoryPage page = service.getDiagnosisHistoryByPet(1L, "owner@example.com", 0, 5);

        assertThat(page.content())
                .extracting(DiagnosisResultResponse::diagnosisId)
                .containsExactly(20L, 10L);
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.totalPages()).isEqualTo(1);
    }

    @Test
    void rejectsPetOwnedByAnotherUserBeforeImageOrProviderProcessing() {
        when(mapper.findOwnedPet(1L, "other@example.com")).thenReturn(null);

        assertThatThrownBy(() -> service.analyzeDiagnosis(new DiagnosisAnalyzeRequest(
                1L, "초코", "DOG", "SKIN", null, List.of("가려움/긁음"),
                "붉은 부위를 계속 긁습니다.", Map.of()), pngImage(), "other@example.com"))
                .isInstanceOf(DiagnosisAccessException.class);

        verify(visionInferenceClient, never()).infer(any(), any(), any());
        verify(imageStorage, never()).save(any(), any());
    }

    private MockMultipartFile pngImage() {
        return DiagnosisTestImages.pngMultipartFile();
    }
}

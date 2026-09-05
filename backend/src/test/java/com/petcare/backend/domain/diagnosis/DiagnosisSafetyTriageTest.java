package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DiagnosisSafetyTriageTest {

    private final DiagnosisSafetyTriage triage = new DiagnosisSafetyTriage();

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "호흡이 없어요, EMERGENCY",
            "호흡 없음, EMERGENCY",
            "숨이 없어요, EMERGENCY",
            "숨을 못 쉬어요, EMERGENCY",
            "호흡 곤란은 없어요, OBSERVATION",
            "발작은 없어요, OBSERVATION",
            "경련이 없습니다., OBSERVATION",
            "발작은 없지 않아요, EMERGENCY",
            "발작이 없는 것 같아요, EMERGENCY",
            "발작은 없어요?, EMERGENCY",
            "발작은 없어요 ?, EMERGENCY",
            "발작은 없어요 라고 확신할 수는 없어요., EMERGENCY",
            "발작 없음 여부를 확인하지 못했습니다., EMERGENCY",
            "호흡 곤란은 없어요 라고는 못하겠어요., EMERGENCY",
            "호흡 곤란은 없어요. 하지만 호흡이 없어요, EMERGENCY",
            "발작은 없어요. 지금은 발작이 있어요, EMERGENCY",
            "발작은 없어요. 상처가 아파요, CAUTION"
    })
    void distinguishesAbsentBreathingFromNegatedSymptoms(
            String description, DiagnosisSafetyTriage.RiskLevel expected) {
        assertThat(triage.evaluate(request("SKIN", List.of("가려움/긁음"), description)).riskLevel())
                .isEqualTo(expected);
    }

    @Test
    void descriptionCannotNegateAnExplicitlySelectedSymptomAcrossFields() {
        assertThat(triage.evaluate(request("SKIN", List.of("발작"), "없어요")).riskLevel())
                .isEqualTo(DiagnosisSafetyTriage.RiskLevel.EMERGENCY);
    }

    @Test
    void classifiesMildSkinObservationWithoutInventingTreatment() {
        DiagnosisSafetyTriage.TriageResult result = triage.evaluate(request(
                "SKIN", List.of("발적/각질"), "작은 부위가 조금 붉습니다."));

        assertThat(result.riskLevel()).isEqualTo(DiagnosisSafetyTriage.RiskLevel.OBSERVATION);
        assertThat(result.actionCodes()).containsExactly("MONITOR_AND_RECORD", "ESCALATE_IF_WORSE");
    }

    @Test
    void classifiesPersistentPainAsCaution() {
        DiagnosisSafetyTriage.TriageResult result = triage.evaluate(request(
                "PAW_LIMB", List.of("통증/예민"), "발을 계속 들고 아파합니다."));

        assertThat(result.riskLevel()).isEqualTo(DiagnosisSafetyTriage.RiskLevel.CAUTION);
    }

    @Test
    void classifiesBreathingDifficultyAsEmergency() {
        DiagnosisSafetyTriage.TriageResult result = triage.evaluate(request(
                "NOSE_RESPIRATORY", List.of("호흡 가쁨"), "갑자기 호흡 곤란이 있습니다."));

        assertThat(result.riskLevel()).isEqualTo(DiagnosisSafetyTriage.RiskLevel.EMERGENCY);
        assertThat(result.actionCodes()).contains("SEEK_EMERGENCY_VET_NOW");
    }

    @Test
    void classifiesSelectedBreathingSymptomAsEmergency() {
        DiagnosisSafetyTriage.TriageResult result = triage.evaluate(request(
                "NOSE_RESPIRATORY", List.of("호흡 가쁨"), "평소보다 힘들어 보입니다."));

        assertThat(result.riskLevel()).isEqualTo(DiagnosisSafetyTriage.RiskLevel.EMERGENCY);
    }

    @Test
    void doesNotTreatNegatedBleedingAsEmergency() {
        DiagnosisSafetyTriage.TriageResult result = triage.evaluate(request(
                "SKIN", List.of("발적/각질"), "피부가 빨갛지만 피가 나지 않습니다."));

        assertThat(result.riskLevel()).isNotEqualTo(DiagnosisSafetyTriage.RiskLevel.EMERGENCY);
    }

    @Test
    void adviceUsesOnlyConservativeAllowlistPhrases() {
        List<String> allGuidance = List.of(
                        triage.evaluate(request("SKIN", List.of("발적/각질"), "조금 붉습니다.")),
                        triage.evaluate(request("ABDOMEN", List.of("구토/토사물"), "한 차례 구토했습니다.")),
                        triage.evaluate(request("NOSE_RESPIRATORY", List.of("호흡 가쁨"), "호흡 곤란이 있습니다.")))
                .stream()
                .flatMap(result -> result.actionGuidance().stream())
                .toList();

        assertThat(allGuidance)
                .noneMatch(text -> text.contains("금식")
                        || text.contains("샴푸")
                        || text.contains("온습포")
                        || text.contains("귀 안에 넣")
                        || text.contains("투약"));
    }

    private DiagnosisAnalyzeRequest request(String area, List<String> symptoms, String description) {
        return new DiagnosisAnalyzeRequest(
                1L, "초코", "DOG", area, null, symptoms, description, Map.of(), "00000000-0000-0000-0000-000000000001");
    }
}

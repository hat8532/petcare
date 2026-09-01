package com.petcare.backend.domain.diagnosis;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Component
public class DiagnosisSafetyTriage {

    private static final List<Pattern> EMERGENCY_PATTERNS = List.of(
            Pattern.compile("호흡\\s*(곤란|불가|가쁨)|숨을\\s*(못|쉬지\\s*않)|청색증|혀가\\s*파"),
            Pattern.compile("의식(이)?\\s*(없|잃)|반응(이)?\\s*없|쓰러(짐|졌)|경련|발작"),
            Pattern.compile("혈변|피똥|토혈|다량(의)?\\s*출혈|출혈(이)?\\s*멈추지|피가\\s*(계속|납니다|나요|났|남|흐르)"),
            Pattern.compile("소변(을)?\\s*(못|안\\s*봄|보지\\s*못)|요도\\s*폐색"),
            Pattern.compile("(초콜릿|양파|포도|백합|사람\\s*약|독성\\s*물질).{0,12}(먹|삼|섭취)"));

    private static final List<Pattern> CAUTION_PATTERNS = List.of(
            Pattern.compile("통증|아파|진물|부종|고름|상처|절뚝|파행"),
            Pattern.compile("구토|설사|식욕\\s*(부진|감소)|기침|충혈|혼탁|악취|분비물"),
            Pattern.compile("계속\\s*긁|심한\\s*가려움|행동\\s*이상|무기력"));

    public TriageResult evaluate(DiagnosisAnalyzeRequest request) {
        String input = normalize(String.join(" ", request.symptoms()) + " " + request.description());
        List<String> reasons = new ArrayList<>();

        if (matchesAny(input, EMERGENCY_PATTERNS)) {
            reasons.add("RED_FLAG_REPORTED");
            return result(RiskLevel.EMERGENCY, reasons);
        }

        boolean caution = matchesAny(input, CAUTION_PATTERNS)
                || List.of("EYE", "NOSE_RESPIRATORY", "ABDOMEN").contains(request.affectedArea());
        if (caution) {
            reasons.add("PROMPT_VET_REVIEW_RECOMMENDED");
            return result(RiskLevel.CAUTION, reasons);
        }

        reasons.add("NO_RED_FLAG_REPORTED");
        return result(RiskLevel.OBSERVATION, reasons);
    }

    private TriageResult result(RiskLevel riskLevel, List<String> reasons) {
        return switch (riskLevel) {
            case OBSERVATION -> new TriageResult(
                    riskLevel,
                    reasons,
                    List.of("MONITOR_AND_RECORD", "ESCALATE_IF_WORSE"),
                    List.of(
                            "환부와 증상의 변화를 사진과 시간으로 기록하세요.",
                            "증상이 악화되거나 새로운 이상 징후가 생기면 동물병원에 문의하세요."));
            case CAUTION -> new TriageResult(
                    riskLevel,
                    reasons,
                    List.of("CONTACT_VET_SOON", "AVOID_UNVERIFIED_TREATMENT"),
                    List.of(
                            "가능한 빠른 시일 내에 동물병원에 문의해 진료 시점을 확인하세요.",
                            "수의사의 안내 전에는 임의로 약·세정제·식이 처치를 사용하지 마세요."));
            case EMERGENCY -> new TriageResult(
                    riskLevel,
                    reasons,
                    List.of("SEEK_EMERGENCY_VET_NOW", "FOLLOW_CLINIC_INSTRUCTIONS"),
                    List.of(
                            "지체하지 말고 가까운 응급 동물병원에 연락한 뒤 이동하세요.",
                            "이동 중에는 병원의 안내를 우선하고 임의 처치를 하지 마세요."));
        };
    }

    private boolean matchesAny(String input, List<Pattern> patterns) {
        return patterns.stream().anyMatch(pattern -> pattern.matcher(input).find());
    }

    private String normalize(String input) {
        return input.toLowerCase(Locale.ROOT)
                .replaceAll("피(가|는)?\\s*(나지|보이지)\\s*않(습니다|아요|음)?", "")
                .replaceAll("출혈(이|은|는)?\\s*(없(습니다|어요|음)?|아님)", "")
                .replaceAll("호흡\\s*(곤란|가쁨)?(이|은|는)?\\s*(없(습니다|어요|음)?|아님)", "")
                .replaceAll("의식(은|이)?\\s*(정상|있(습니다|어요|음)?)", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public enum RiskLevel {
        OBSERVATION("관찰 (OBSERVATION)"),
        CAUTION("주의 (CAUTION)"),
        EMERGENCY("응급/병원방문 (EMERGENCY)");

        private final String label;

        RiskLevel(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    public record TriageResult(
            RiskLevel riskLevel,
            List<String> reasons,
            List<String> actionCodes,
            List<String> actionGuidance
    ) {
        public TriageResult {
            reasons = List.copyOf(reasons);
            actionCodes = List.copyOf(actionCodes);
            actionGuidance = List.copyOf(actionGuidance);
        }
    }
}

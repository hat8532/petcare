package com.petcare.backend.domain.diagnosis;

public class DiagnosisConflictException extends RuntimeException {
    public DiagnosisConflictException() {
        super("같은 요청 식별값에 다른 입력을 사용할 수 없습니다. 새 진단으로 실행해 주세요.");
    }
}

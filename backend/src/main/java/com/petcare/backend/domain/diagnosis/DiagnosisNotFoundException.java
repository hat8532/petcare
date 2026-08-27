package com.petcare.backend.domain.diagnosis;

public class DiagnosisNotFoundException extends RuntimeException {

    public DiagnosisNotFoundException() {
        super("해당 진단 기록을 찾을 수 없습니다.");
    }
}

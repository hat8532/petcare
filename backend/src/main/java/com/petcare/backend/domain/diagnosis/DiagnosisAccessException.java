package com.petcare.backend.domain.diagnosis;

import org.springframework.http.HttpStatus;

public class DiagnosisAccessException extends RuntimeException {

    private final HttpStatus status;

    public DiagnosisAccessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static DiagnosisAccessException authenticationRequired() {
        return new DiagnosisAccessException(HttpStatus.UNAUTHORIZED, "진단 기능은 로그인이 필요합니다.");
    }

    public static DiagnosisAccessException petNotFound() {
        return new DiagnosisAccessException(HttpStatus.NOT_FOUND, "접근 가능한 반려동물을 찾을 수 없습니다.");
    }
}

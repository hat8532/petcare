package com.petcare.backend.domain.diagnosis.exception;

public class DiagnosisRequestException extends RuntimeException {

    public DiagnosisRequestException(String message) {
        super(message);
    }
}

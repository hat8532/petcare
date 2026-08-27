package com.petcare.backend.domain.diagnosis;

import org.springframework.http.HttpStatus;

public class DiagnosisImageException extends RuntimeException {

    private final HttpStatus status;

    public DiagnosisImageException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

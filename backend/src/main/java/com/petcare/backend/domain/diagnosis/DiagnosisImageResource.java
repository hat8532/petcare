package com.petcare.backend.domain.diagnosis;

public record DiagnosisImageResource(byte[] bytes, String contentType) {
    public DiagnosisImageResource {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }
}

package com.petcare.backend.domain.diagnosis;

public record ValidatedDiagnosisImage(
        byte[] bytes,
        String contentType,
        String extension,
        int width,
        int height
) {
    public ValidatedDiagnosisImage {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }

    public String safeFilename() {
        return "diagnosis-image." + extension;
    }
}

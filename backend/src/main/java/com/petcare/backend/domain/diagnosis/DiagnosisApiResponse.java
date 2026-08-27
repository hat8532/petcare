package com.petcare.backend.domain.diagnosis;

public record DiagnosisApiResponse<T>(
        int code,
        String message,
        T data
) {
    public static <T> DiagnosisApiResponse<T> success(T data) {
        return new DiagnosisApiResponse<>(200, "SUCCESS", data);
    }

    public static <T> DiagnosisApiResponse<T> error(int code, String message) {
        return new DiagnosisApiResponse<>(code, message, null);
    }
}

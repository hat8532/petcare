package com.petcare.backend.domain.diagnosis;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {DiagnosisController.class, PetDiagnosisController.class})
public class DiagnosisExceptionHandler {

    @ExceptionHandler(DiagnosisNotFoundException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleNotFound(DiagnosisNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(DiagnosisApiResponse.error(HttpStatus.NOT_FOUND.value(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("진단 요청 값이 올바르지 않습니다.");

        return ResponseEntity.badRequest()
                .body(DiagnosisApiResponse.error(400, message));
    }
}

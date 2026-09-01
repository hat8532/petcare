package com.petcare.backend.domain.diagnosis;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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

    @ExceptionHandler(DiagnosisAccessException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleAccess(DiagnosisAccessException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(DiagnosisApiResponse.error(exception.getStatus().value(), exception.getMessage()));
    }

    @ExceptionHandler(DiagnosisRequestException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleRequest(DiagnosisRequestException exception) {
        return ResponseEntity.badRequest()
                .body(DiagnosisApiResponse.error(HttpStatus.BAD_REQUEST.value(), exception.getMessage()));
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

    @ExceptionHandler(DiagnosisImageException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleImage(DiagnosisImageException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(DiagnosisApiResponse.error(exception.getStatus().value(), exception.getMessage()));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleMissingPart(
            MissingServletRequestPartException exception) {
        return ResponseEntity.badRequest()
                .body(DiagnosisApiResponse.error(400, exception.getRequestPartName() + " Part가 필요합니다."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleUnreadableRequest(
            HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest()
                .body(DiagnosisApiResponse.error(400, "진단 Request JSON 형식이 올바르지 않습니다."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest()
                .body(DiagnosisApiResponse.error(400, exception.getName() + " 값의 형식이 올바르지 않습니다."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<DiagnosisApiResponse<Void>> handleUploadSize(
            MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(DiagnosisApiResponse.error(413, "Image File은 10MB 이하만 전송할 수 있습니다."));
    }
}

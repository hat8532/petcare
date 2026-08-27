package com.petcare.backend.domain.diagnosis;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

@Component
public class DiagnosisImageValidator {

    static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_MEDIA_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    public void validate(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new DiagnosisImageException(HttpStatus.BAD_REQUEST, "진단할 환부 Image File이 필요합니다.");
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            throw new DiagnosisImageException(HttpStatus.PAYLOAD_TOO_LARGE, "Image File은 10MB 이하만 전송할 수 있습니다.");
        }
        if (!ALLOWED_MEDIA_TYPES.contains(image.getContentType())) {
            throw new DiagnosisImageException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "JPEG, PNG 또는 WEBP Image만 전송할 수 있습니다.");
        }

        try {
            byte[] signature = image.getInputStream().readNBytes(12);
            if (!matchesContentType(image.getContentType(), signature)) {
                throw new DiagnosisImageException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Image 형식과 실제 File 내용이 일치하지 않습니다.");
            }
        } catch (IOException exception) {
            throw new DiagnosisImageException(HttpStatus.BAD_REQUEST, "Image File을 읽을 수 없습니다.");
        }
    }

    private boolean matchesContentType(String contentType, byte[] signature) {
        if ("image/jpeg".equals(contentType)) {
            return signature.length >= 3
                    && unsigned(signature[0]) == 0xFF
                    && unsigned(signature[1]) == 0xD8
                    && unsigned(signature[2]) == 0xFF;
        }
        if ("image/png".equals(contentType)) {
            return signature.length >= 8
                && unsigned(signature[0]) == 0x89
                && signature[1] == 'P'
                && signature[2] == 'N'
                && signature[3] == 'G'
                && unsigned(signature[4]) == 0x0D
                && unsigned(signature[5]) == 0x0A
                && unsigned(signature[6]) == 0x1A
                && unsigned(signature[7]) == 0x0A;
        }
        return signature.length >= 12
                && signature[0] == 'R'
                && signature[1] == 'I'
                && signature[2] == 'F'
                && signature[3] == 'F'
                && signature[8] == 'W'
                && signature[9] == 'E'
                && signature[10] == 'B'
                && signature[11] == 'P';
    }

    private int unsigned(byte value) {
        return value & 0xFF;
    }
}

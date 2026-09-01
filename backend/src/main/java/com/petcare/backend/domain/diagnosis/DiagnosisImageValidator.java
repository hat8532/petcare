package com.petcare.backend.domain.diagnosis;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Set;

@Component
public class DiagnosisImageValidator {

    static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    static final int MAX_IMAGE_DIMENSION = 8_000;
    static final long MAX_IMAGE_PIXELS = 25_000_000L;
    private static final Set<String> ALLOWED_MEDIA_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    public ValidatedDiagnosisImage validate(MultipartFile image) {
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
            byte[] bytes = image.getInputStream().readNBytes((int) MAX_IMAGE_BYTES + 1);
            if (bytes.length > MAX_IMAGE_BYTES) {
                throw new DiagnosisImageException(HttpStatus.PAYLOAD_TOO_LARGE, "Image File은 10MB 이하만 전송할 수 있습니다.");
            }
            if (!matchesContentType(image.getContentType(), bytes)) {
                throw new DiagnosisImageException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Image 형식과 실제 File 내용이 일치하지 않습니다.");
            }

            return validateContent(image.getContentType(), bytes);
        } catch (IOException exception) {
            throw new DiagnosisImageException(HttpStatus.BAD_REQUEST, "Image File을 읽을 수 없습니다.");
        }
    }

    private ValidatedDiagnosisImage validateContent(String contentType, byte[] bytes) {
        String outputFormat = "image/jpeg".equals(contentType) ? "jpg" : "png";
        String normalizedContentType = "jpg".equals(outputFormat) ? "image/jpeg" : "image/png";

        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) {
                throw invalidImage();
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }

            ImageReader reader = readers.next();
            BufferedImage decoded;
            int width;
            int height;
            try {
                reader.setInput(input, true, true);
                // 전체 Bitmap을 메모리에 만들기 전에 Header 차원부터 제한한다.
                width = reader.getWidth(0);
                height = reader.getHeight(0);
                validateDimensions(width, height);
                decoded = reader.read(0);
            } finally {
                reader.dispose();
            }

            if (decoded == null || decoded.getWidth() != width || decoded.getHeight() != height) {
                throw invalidImage();
            }

            BufferedImage sanitized = "jpg".equals(outputFormat) ? flattenForJpeg(decoded) : decoded;
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (!ImageIO.write(sanitized, outputFormat, output)) {
                throw invalidImage();
            }
            byte[] sanitizedBytes = output.toByteArray();
            if (sanitizedBytes.length > MAX_IMAGE_BYTES) {
                throw new DiagnosisImageException(HttpStatus.PAYLOAD_TOO_LARGE, "정규화한 Image가 10MB를 초과합니다.");
            }
            return new ValidatedDiagnosisImage(
                    sanitizedBytes, normalizedContentType, outputFormat, width, height);
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    private BufferedImage flattenForJpeg(BufferedImage source) {
        BufferedImage target = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, target.getWidth(), target.getHeight());
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return target;
    }

    private void validateDimensions(int width, int height) {
        if (width <= 0 || height <= 0
                || width > MAX_IMAGE_DIMENSION
                || height > MAX_IMAGE_DIMENSION
                || (long) width * height > MAX_IMAGE_PIXELS) {
            throw new DiagnosisImageException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Image 해상도는 한 변 8000px, 총 2500만 pixel 이하여야 합니다.");
        }
    }

    private DiagnosisImageException invalidImage() {
        return new DiagnosisImageException(HttpStatus.BAD_REQUEST, "손상되었거나 해석할 수 없는 Image File입니다.");
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

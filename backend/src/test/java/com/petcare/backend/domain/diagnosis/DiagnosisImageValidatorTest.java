package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DiagnosisImageValidatorTest {

    private final DiagnosisImageValidator validator = new DiagnosisImageValidator();

    @Test
    void acceptsJpegSignature() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "lesion.jpg", "image/jpeg",
                DiagnosisTestImages.jpegBytes(2, 2));

        ValidatedDiagnosisImage validated = validator.validate(image);

        assertThat(validated.contentType()).isEqualTo("image/jpeg");
        assertThat(validated.safeFilename()).isEqualTo("diagnosis-image.jpg");
        assertThat(validated.width()).isEqualTo(2);
        assertThat(validated.height()).isEqualTo(2);
    }

    @Test
    void decodesWebpAndNormalizesItToMetadataFreePng() {
        byte[] webp = Base64.getDecoder().decode(
                "UklGRjoAAABXRUJQVlA4IC4AAABQAQCdASoCAAIAAgA0JQBOgC6gAP7jyNpi7Bks5XUAhvdGGqTyzOFeyxGGdYAA");
        MockMultipartFile image = new MockMultipartFile(
                "image", "lesion.webp", "image/webp", webp);

        ValidatedDiagnosisImage validated = validator.validate(image);

        assertThat(validated.width()).isEqualTo(2);
        assertThat(validated.height()).isEqualTo(2);
        assertThat(validated.contentType()).isEqualTo("image/png");
        assertThat(validated.extension()).isEqualTo("png");
        assertThat(validated.bytes()).startsWith(
                (byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G');
    }

    @Test
    void rejectsWebpHeaderWithoutDecodableImageData() {
        byte[] webp = new byte[30];
        System.arraycopy(new byte[]{'R', 'I', 'F', 'F'}, 0, webp, 0, 4);
        System.arraycopy(new byte[]{'W', 'E', 'B', 'P'}, 0, webp, 8, 4);
        System.arraycopy(new byte[]{'V', 'P', '8', 'X'}, 0, webp, 12, 4);
        MockMultipartFile image = new MockMultipartFile(
                "image", "lesion.webp", "image/webp", webp);

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsUnsupportedMediaType() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "lesion.gif", "image/gif", new byte[]{'G', 'I', 'F'});

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE));
    }

    @Test
    void rejectsContentThatDoesNotMatchDeclaredType() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "fake.jpg", "image/jpeg", "not-an-image".getBytes());

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE));
    }

    @Test
    void rejectsImageLargerThanTenMegabytes() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "large.png", "image/png",
                new byte[(int) DiagnosisImageValidator.MAX_IMAGE_BYTES + 1]);

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
    }

    @Test
    void rejectsTruncatedJpegEvenWhenSignatureMatches() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "truncated.jpg", "image/jpeg",
                new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00});

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsImageWithExcessiveDimensions() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "wide.png", "image/png",
                DiagnosisTestImages.pngBytes(8_001, 1));

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
    }
}

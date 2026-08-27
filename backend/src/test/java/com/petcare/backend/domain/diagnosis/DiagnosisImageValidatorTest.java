package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DiagnosisImageValidatorTest {

    private final DiagnosisImageValidator validator = new DiagnosisImageValidator();

    @Test
    void acceptsJpegSignature() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "lesion.jpg", "image/jpeg",
                new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00});

        assertThatCode(() -> validator.validate(image)).doesNotThrowAnyException();
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
    void rejectsImageLargerThanOneMegabyte() {
        MockMultipartFile image = new MockMultipartFile(
                "image", "large.png", "image/png",
                new byte[(int) DiagnosisImageValidator.MAX_IMAGE_BYTES + 1]);

        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(DiagnosisImageException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
    }
}

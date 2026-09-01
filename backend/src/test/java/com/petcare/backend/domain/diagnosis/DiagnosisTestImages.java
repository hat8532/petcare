package com.petcare.backend.domain.diagnosis;

import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

final class DiagnosisTestImages {

    private DiagnosisTestImages() {
    }

    static MockMultipartFile pngMultipartFile() {
        return new MockMultipartFile(
                "image",
                "lesion.png",
                MediaType.IMAGE_PNG_VALUE,
                pngBytes(2, 2));
    }

    static byte[] pngBytes(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, Color.RED.getRGB());
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Test PNG를 만들 수 없습니다.", exception);
        }
    }

    static byte[] jpegBytes(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, Color.RED.getRGB());
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Test JPEG를 만들 수 없습니다.", exception);
        }
    }
}

package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class VisionInferenceClientTest {

    @Test
    void sendsMultipartImageAndPreservesProviderFailureCode() throws Exception {
        AtomicReference<String> requestContentType = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/diagnoses/infer", exchange -> {
            requestContentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            byte[] response = """
                    {"detail":{"failureCode":"MODEL_UNAVAILABLE","requestId":"request-001"}}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(503, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();

        try {
            VisionInferenceClient client = new VisionInferenceClient(
                    true,
                    "http://127.0.0.1:" + server.getAddress().getPort(),
                    new ObjectMapper());
            DiagnosisAnalyzeRequest request = new DiagnosisAnalyzeRequest(
                    1L, "초코", "DOG", "SKIN", "", List.of("가려움/긁음"),
                    "붉은 부위를 계속 긁습니다.", Map.of());
            MockMultipartFile image = new MockMultipartFile(
                    "image", "lesion.jpg", "image/jpeg",
                    DiagnosisTestImages.jpegBytes(2, 2));

            VisionInferenceResult result = client.infer(
                    request, new DiagnosisImageValidator().validate(image), "request-001");

            assertThat(result.failureCode()).isEqualTo("MODEL_UNAVAILABLE");
            assertThat(result.mode()).isEqualTo("RULE_FALLBACK");
            assertThat(requestContentType.get()).startsWith("multipart/form-data;boundary=");
            assertThat(requestBody.get())
                    .contains("name=\"image\"", "filename=\"diagnosis-image.jpg\"", "name=\"petId\"", "request-001");
        } finally {
            server.stop(0);
        }
    }
}

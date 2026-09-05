package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class VisionInferenceClientTest {

    @Test
    void fallbackDoesNotClaimTheImageWasNeverAnalyzed() {
        VisionInferenceResult result = VisionInferenceResult.unavailable("INFERENCE_TIMEOUT", "request-timeout");

        assertThat(result.limitations()).containsExactly(
                "사용 가능한 AI 이미지 분석 결과를 확보하지 못했습니다. 위험도는 입력한 증상 규칙으로 계산했습니다.");
        assertThat(result.predictions()).isEmpty();
        assertThat(result.failureCode()).isEqualTo("INFERENCE_TIMEOUT");
    }

    @Test
    void readsValidatedRagPrototypeAfterThePreviousTenSecondLimit() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/diagnoses/infer", exchange -> {
            exchange.getRequestBody().readAllBytes();
            try {
                // 이전 10초 설정에서는 실패하던 지연 응답을 실제 로컬 HTTP로 확인한다.
                TimeUnit.SECONDS.sleep(11);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                exchange.close();
                return;
            }
            byte[] response = """
                    {
                      "mode":"GEMINI_RAG_PROTOTYPE",
                      "model":"gemini-test",
                      "modelVersion":"v1",
                      "predictions":[{"diseaseName":"피부 발적 소견","probability":72.5}],
                      "limitations":["사진 한 장만 분석했습니다."],
                      "ragReport":"가려움은 하나의 질병명이 아니라 여러 원인에서 나타나는 증상이다. 개에서는 기생충, 감염, 알레르기 등이 흔한 원인 범주이며, 털 빠짐·각질·냄새·분비물이 동반되면 감염 가능성도 함께 평가해야 한다. [merck-dog-pruritus]",
                      "ragSources":[{
                        "sourceId":"merck-dog-pruritus",
                        "title":"Itching (Pruritus) in Dogs",
                        "publisher":"Merck Veterinary Manual",
                        "sourceUrl":"https://www.merckvetmanual.com/dog-owners/skin-disorders-of-dogs/itching-pruritus-in-dogs"
                      }],
                      "failureCode":null,
                      "requestId":"request-rag"
                    }
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
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
                    request, new DiagnosisImageValidator().validate(image), "request-rag");

            assertThat(result.mode()).isEqualTo("GEMINI_RAG_PROTOTYPE");
            assertThat(result.ragReport()).contains("[merck-dog-pruritus]");
            assertThat(result.ragSources())
                    .containsExactly(new VisionInferenceResult.RagSource(
                            "merck-dog-pruritus",
                            "Itching (Pruritus) in Dogs",
                            "Merck Veterinary Manual",
                            "https://www.merckvetmanual.com/dog-owners/skin-disorders-of-dogs/itching-pruritus-in-dogs"));
        } finally {
            server.stop(0);
        }
    }

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

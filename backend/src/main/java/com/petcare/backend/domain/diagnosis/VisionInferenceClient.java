package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

import java.net.SocketTimeoutException;
import java.util.UUID;

@Component
public class VisionInferenceClient {

    private final boolean enabled;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final VisionInferenceResultValidator resultValidator;

    public VisionInferenceClient(
            @Value("${diagnosis.vision.enabled:false}") boolean enabled,
            @Value("${diagnosis.vision.base-url:http://127.0.0.1:8000}") String baseUrl,
            ObjectMapper objectMapper) {
        this.enabled = enabled;
        this.objectMapper = objectMapper;
        this.resultValidator = new VisionInferenceResultValidator();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3_000);
        // Gemini 두 단계의 합산 제한 30초보다 길고, 화면의 45초 제한보다 짧게 둔다.
        requestFactory.setReadTimeout(35_000);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public VisionInferenceResult infer(
            DiagnosisAnalyzeRequest request,
            ValidatedDiagnosisImage image,
            String requestId) {
        if (!enabled) {
            return VisionInferenceResult.unavailable("VISION_DISABLED", requestId);
        }

        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            HttpHeaders imageHeaders = new HttpHeaders();
            imageHeaders.setContentType(MediaType.parseMediaType(image.contentType()));
            body.add("image", new HttpEntity<>(imageResource(image), imageHeaders));
            body.add("petId", request.petId().toString());
            body.add("species", request.petSpecies());
            body.add("affectedArea", request.affectedArea());
            body.add("symptoms", objectMapper.writeValueAsString(request.symptoms()));
            body.add("description", request.description());
            body.add("requestId", requestId);

            VisionInferenceResult result = restClient.post()
                    .uri("/v1/diagnoses/infer")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(VisionInferenceResult.class);

            return resultValidator.validate(result, requestId);
        } catch (RestClientResponseException exception) {
            return VisionInferenceResult.unavailable(readFailureCode(exception), requestId);
        } catch (ResourceAccessException exception) {
            String failureCode = hasCause(exception, SocketTimeoutException.class)
                    ? "INFERENCE_TIMEOUT"
                    : "PROVIDER_UNAVAILABLE";
            return VisionInferenceResult.unavailable(failureCode, requestId);
        } catch (Exception exception) {
            return VisionInferenceResult.unavailable("PROVIDER_UNAVAILABLE", requestId);
        }
    }

    private ByteArrayResource imageResource(ValidatedDiagnosisImage image) {
        return new ByteArrayResource(image.bytes()) {
            @Override
            public String getFilename() {
                return image.safeFilename();
            }
        };
    }

    private String readFailureCode(RestClientResponseException exception) {
        try {
            JsonNode root = objectMapper.readTree(exception.getResponseBodyAsString());
            JsonNode failureCode = root.path("detail").path("failureCode");
            if (failureCode.isTextual()) {
                return resultValidator.normalizeFailureCode(failureCode.asText());
            }
        } catch (Exception ignored) {
            // Provider가 Contract 밖의 Body를 반환하면 안전한 공통 실패 Code로 축소한다.
        }
        return exception.getStatusCode().value() == 504
                ? "INFERENCE_TIMEOUT"
                : "PROVIDER_UNAVAILABLE";
    }

    private boolean hasCause(Throwable throwable, Class<? extends Throwable> expectedType) {
        Throwable current = throwable;
        while (current != null) {
            if (expectedType.isInstance(current)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    public static String newRequestId() {
        return UUID.randomUUID().toString();
    }
}

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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Component
public class VisionInferenceClient {

    private final boolean enabled;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public VisionInferenceClient(
            @Value("${diagnosis.vision.enabled:false}") boolean enabled,
            @Value("${diagnosis.vision.base-url:http://127.0.0.1:8000}") String baseUrl,
            ObjectMapper objectMapper) {
        this.enabled = enabled;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3_000);
        requestFactory.setReadTimeout(10_000);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public VisionInferenceResult infer(
            DiagnosisAnalyzeRequest request,
            MultipartFile image,
            String requestId) {
        if (!enabled) {
            return VisionInferenceResult.unavailable("VISION_DISABLED", requestId);
        }

        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            HttpHeaders imageHeaders = new HttpHeaders();
            imageHeaders.setContentType(MediaType.parseMediaType(image.getContentType()));
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

            return result == null
                    ? VisionInferenceResult.unavailable("INVALID_PROVIDER_RESPONSE", requestId)
                    : result;
        } catch (RestClientResponseException exception) {
            return VisionInferenceResult.unavailable(readFailureCode(exception), requestId);
        } catch (Exception exception) {
            return VisionInferenceResult.unavailable("PROVIDER_UNAVAILABLE", requestId);
        }
    }

    private ByteArrayResource imageResource(MultipartFile image) throws IOException {
        byte[] bytes = image.getBytes();
        String filename = image.getOriginalFilename() == null ? "diagnosis-image" : image.getOriginalFilename();
        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }

    private String readFailureCode(RestClientResponseException exception) {
        try {
            JsonNode root = objectMapper.readTree(exception.getResponseBodyAsString());
            JsonNode failureCode = root.path("detail").path("failureCode");
            if (failureCode.isTextual()) {
                return failureCode.asText();
            }
        } catch (Exception ignored) {
            // Provider가 Contract 밖의 Body를 반환하면 안전한 공통 실패 Code로 축소한다.
        }
        return exception.getStatusCode().value() == 504
                ? "INFERENCE_TIMEOUT"
                : "PROVIDER_UNAVAILABLE";
    }

    public static String newRequestId() {
        return UUID.randomUUID().toString();
    }
}

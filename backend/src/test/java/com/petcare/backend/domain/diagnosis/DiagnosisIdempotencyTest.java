package com.petcare.backend.domain.diagnosis;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {"spring.profiles.include=", "naver.news.client-id=", "naver.news.client-secret=", "gemini.api.key="})
class DiagnosisIdempotencyTest {
    @Autowired DiagnosisService service;
    @Autowired DiagnosisRecordMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean VisionInferenceClient provider;
    @MockitoBean DiagnosisImageStorage storage;
    @MockitoBean com.petcare.backend.global.config.DataInitializer sampleDataInitializer;
    private String owner;
    private Long userId;
    private Long petId;
    private String key;

    @BeforeEach
    void fixture() {
        owner = UUID.randomUUID() + "@petcare.test";
        key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(email,password,nickname) VALUES (?, 'fixture', 'fixture')", owner);
        userId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, owner);
        jdbc.update("INSERT INTO pets(user_id,name,species) VALUES (?, 'fixture', 'DOG')", userId);
        petId = jdbc.queryForObject("SELECT id FROM pets WHERE user_id=?", Long.class, userId);
        when(provider.infer(any(), any(), any())).thenAnswer(i ->
                VisionInferenceResult.unavailable("MODEL_UNAVAILABLE", i.getArgument(2)));
        when(storage.save(any(), any())).thenAnswer(i -> UUID.randomUUID() + ".png");
    }

    private DiagnosisAnalyzeRequest request(String text) {
        return new DiagnosisAnalyzeRequest(petId, "fixture", "DOG", "SKIN", "",
                List.of("가려움/긁음"), text, Map.of(), key);
    }

    @Test
    void lostResponseReplayAndServiceRestartReturnOneStoredRecord() {
        var first = service.analyzeDiagnosis(request("붉은 피부"), DiagnosisTestImages.pngMultipartFile(), owner);
        // Service 객체를 새로 만들어도 메모리 cache가 아닌 저장된 Row로 재사용한다.
        var restarted = new DiagnosisService(mapper, json, new DiagnosisImageValidator(), storage, provider,
                new DiagnosisSafetyTriage());
        var second = restarted.analyzeDiagnosis(request("붉은 피부"), DiagnosisTestImages.pngMultipartFile(), owner);
        assertThat(second).isEqualTo(first);
        verify(provider, times(1)).infer(any(), any(), any());
        assertThat(count()).isEqualTo(1);
    }

    @Test
    void sameKeyDifferentInputIsConflictAndNonOwnerCannotReplay() {
        service.analyzeDiagnosis(request("붉은 피부"), DiagnosisTestImages.pngMultipartFile(), owner);
        assertThatThrownBy(() -> service.analyzeDiagnosis(request("다른 증상"), DiagnosisTestImages.pngMultipartFile(), owner))
                .isInstanceOf(DiagnosisConflictException.class);
        assertThatThrownBy(() -> service.analyzeDiagnosis(request("붉은 피부"), DiagnosisTestImages.pngMultipartFile(), "other@petcare.test"))
                .isInstanceOf(DiagnosisAccessException.class);
        verify(provider, times(1)).infer(any(), any(), any());
        assertThat(count()).isEqualTo(1);
    }

    @Test
    void sameKeyIsScopedToOwner() {
        var first = service.analyzeDiagnosis(request("붉은 피부"), DiagnosisTestImages.pngMultipartFile(), owner);
        String sharedKey = key;
        fixture();
        key = sharedKey;
        var second = service.analyzeDiagnosis(request("붉은 피부"), DiagnosisTestImages.pngMultipartFile(), owner);
        assertThat(second.diagnosisId()).isNotEqualTo(first.diagnosisId());
        assertThat(count()).isEqualTo(1);
    }

    @Test
    void concurrentSubmissionsHaveOneWinnerAndOnlyLoserImageIsCleaned() throws Exception {
        CountDownLatch bothInProvider = new CountDownLatch(2);
        when(provider.infer(any(), any(), any())).thenAnswer(i -> {
            bothInProvider.countDown();
            if (!bothInProvider.await(5, TimeUnit.SECONDS)) throw new AssertionError("동시 Provider 진입 실패");
            return VisionInferenceResult.unavailable("MODEL_UNAVAILABLE", i.getArgument(2));
        });
        var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> service.analyzeDiagnosis(request("동일 입력"), DiagnosisTestImages.pngMultipartFile(), owner));
            var b = pool.submit(() -> service.analyzeDiagnosis(request("동일 입력"), DiagnosisTestImages.pngMultipartFile(), owner));
            assertThat(a.get(10, TimeUnit.SECONDS).diagnosisId()).isEqualTo(b.get(10, TimeUnit.SECONDS).diagnosisId());
            assertThat(count()).isEqualTo(1);
            String winnerImage = mapper.findByIdempotencyKey(userId, key).getImageUrl();
            verify(storage, never()).deleteQuietly(winnerImage);
            verify(storage, times(1)).deleteQuietly(anyString());
        } finally { pool.shutdownNow(); }
    }

    @Test
    void legacyNullRequestsRemainValidAndPartialKeyIsRejected() {
        jdbc.update("INSERT INTO diagnosis_records(user_id,pet_id,affected_area) VALUES (?,?,'SKIN'),(?,?,'SKIN')",
                userId, petId, userId, petId);
        assertThat(count()).isEqualTo(2);
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO diagnosis_records(user_id,pet_id,affected_area,idempotency_key) VALUES (?,?,'SKIN',?)", userId, petId, key))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    private long count() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM diagnosis_records WHERE user_id=?", Long.class, userId);
    }
}

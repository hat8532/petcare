package com.petcare.backend.domain.diagnosis;

import com.petcare.backend.global.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// 실제 SecurityFilterChain + H2. Provider나 공유 DB 호출 없이 필터/Controller 경계를 검증한다.
@SpringBootTest
@AutoConfigureMockMvc
@Import(DiagnosisSecurityFilterTest.DeniedFixture.class)
class DiagnosisSecurityFilterTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;

    @RestController
    static class DeniedFixture {
        @GetMapping("/api/v1/diagnosis/fixture-denied")
        void denied() { throw new AccessDeniedException("fixture"); }
    }

    @Test
    void authenticatedAccessDenialUsesCommon403Envelope() throws Exception {
        String token = jwtUtil.generateAccessToken(1L, "fixture@petcare.test", "ROLE_USER");
        mvc.perform(get("/api/v1/diagnosis/fixture-denied").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("접근 권한이 없습니다."))
                .andExpect(jsonPath("$.status").doesNotExist());
    }

    @Test
    void anonymousDetailAndImageUseCommon401Envelope() throws Exception {
        for (String path : new String[]{"/api/v1/diagnosis/1", "/api/v1/diagnosis/1/image", "/api/v1/pets/1/diagnoses"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value(401))
                    .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                    .andExpect(jsonPath("$.status").doesNotExist());
        }
    }

    @Test
    void invalidBearerCannotReachDiagnosisCreation() throws Exception {
        mvc.perform(multipart("/api/v1/diagnosis").header("Authorization", "Bearer fixture-invalid"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void publicSymptomsAndPreflightRemainAccessible() throws Exception {
        mvc.perform(get("/api/v1/diagnosis/symptoms"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.SKIN").isArray());
        mvc.perform(options("/api/v1/diagnosis").header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().exists("Access-Control-Allow-Origin"));
    }
}

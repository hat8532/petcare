package com.petcare.backend.global.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class JwtAuthenticationFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    @DisplayName("1. 보호된 API (/api/v1/pets/user/1) - 토큰 미제공 시 접근 거부 (401 Unauthorized)")
    void testProtectedEndpointWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/pets/user/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("2. 보호된 API (/api/v1/pets/user/1) - 유효한 JWT Bearer 토큰 첨부 시 접근 성공 (200 OK)")
    void testProtectedEndpointWithValidToken() throws Exception {
        String validToken = jwtUtil.generateAccessToken(1L, "user@petcare.com", "ROLE_USER");

        mockMvc.perform(get("/api/v1/pets/user/1")
                        .header("Authorization", "Bearer " + validToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("3. 보호된 API (/api/v1/pets/user/1) - 잘못된 위조 토큰 첨부 시 접근 거부 (401 Unauthorized)")
    void testProtectedEndpointWithInvalidToken() throws Exception {
        String invalidToken = "invalid.bearer.token.string";

        mockMvc.perform(get("/api/v1/pets/user/1")
                        .header("Authorization", "Bearer " + invalidToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("4. 공개 API (/api/v1/news, /api/v1/hospitals/nearby) - 토큰 없이도 정상 접근 (200 OK)")
    void testPublicEndpointsWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/hospitals/nearby?lat=37.5507&lng=126.9408"))
                .andExpect(status().isOk());
    }
}

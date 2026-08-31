package com.petcare.backend.global.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    @Test
    void missingConfiguredSecretUsesUnpredictableProcessLocalKeys() {
        JwtUtil firstProcess = new JwtUtil("");
        JwtUtil secondProcess = new JwtUtil("");

        String firstToken = firstProcess.generateAccessToken(1L, "owner@example.com", "ROLE_USER");

        assertThat(firstProcess.validateToken(firstToken)).isTrue();
        assertThat(secondProcess.validateToken(firstToken)).isFalse();
    }
}

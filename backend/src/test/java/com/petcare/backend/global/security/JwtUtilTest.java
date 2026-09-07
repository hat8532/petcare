package com.petcare.backend.global.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    @Test
    void missingConfiguredSecretUsesUnpredictableProcessLocalKeys() {
        JwtUtil firstProcess = new JwtUtil("");
        JwtUtil secondProcess = new JwtUtil("");

        String firstToken = firstProcess.generateAccessToken(1L, "owner@example.com", "ROLE_USER");

        assertThat(firstProcess.validateAccessToken(firstToken)).isTrue();
        assertThat(secondProcess.validateAccessToken(firstToken)).isFalse();
    }

    @Test
    void accessAndRefreshTokensCannotBeUsedInterchangeably() {
        JwtUtil jwtUtil = new JwtUtil("");
        String accessToken = jwtUtil.generateAccessToken(1L, "owner@example.com", "ROLE_USER");
        String refreshToken = jwtUtil.generateRefreshToken(1L, "owner@example.com");

        assertThat(jwtUtil.validateAccessToken(accessToken)).isTrue();
        assertThat(jwtUtil.validateRefreshToken(accessToken)).isFalse();
        assertThat(jwtUtil.validateRefreshToken(refreshToken)).isTrue();
        assertThat(jwtUtil.validateAccessToken(refreshToken)).isFalse();
    }
}

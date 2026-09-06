package com.petcare.backend.domain.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

public class AuthDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SignupRequest {
        @NotBlank(message = "이메일은 필수 입력 항목입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @Size(max = 100, message = "이메일은 100자 이하로 입력해 주세요.")
        private String email;

        @NotBlank(message = "비밀번호는 필수 입력 항목입니다.")
        @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,128}$",
            message = "비밀번호는 영문, 숫자, 특수문자를 포함하여 8~128자여야 합니다."
        )
        private String password;

        @Size(max = 50, message = "닉네임은 50자 이하로 입력해 주세요.")
        private String nickname;
        @Size(max = 20, message = "전화번호는 20자 이하로 입력해 주세요.")
        private String phone;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {
        @NotBlank(message = "이메일은 필수 입력 항목입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @Size(max = 100, message = "이메일은 100자 이하로 입력해 주세요.")
        private String email;

        @NotBlank(message = "비밀번호는 필수 입력 항목입니다.")
        @Size(max = 128, message = "비밀번호는 128자 이하로 입력해 주세요.")
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RefreshTokenRequest {
        @NotBlank(message = "Refresh Token은 필수 입력 항목입니다.")
        @Size(max = 4096, message = "Refresh Token 길이가 올바르지 않습니다.")
        private String refreshToken;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OAuthCodeExchangeRequest {
        @NotBlank(message = "OAuth Login Code는 필수 입력 항목입니다.")
        @Size(max = 128, message = "OAuth Login Code 길이가 올바르지 않습니다.")
        private String code;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ForgotPasswordRequest {
        @NotBlank(message = "이메일은 필수 입력 항목입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @Size(max = 100, message = "이메일은 100자 이하로 입력해 주세요.")
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AvailabilityResponse {
        private boolean available;
        private String message;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummary {
        private Long id;
        private String email;
        private String nickname;
        private String role;
        private String profileImageUrl;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthResponse {
        private String status;
        private String message;
        private String accessToken;
        private String refreshToken;
        private String tokenType;
        private UserSummary user;
    }
}

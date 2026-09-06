package com.petcare.backend.global.security;

import com.petcare.backend.domain.auth.SocialAccountMapper;
import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserMapper userMapper;
    private final SocialAccountMapper socialAccountMapper;
    private final PasswordEncoder passwordEncoder;

    public CustomOAuth2UserService(UserMapper userMapper,
                                   SocialAccountMapper socialAccountMapper,
                                   PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.socialAccountMapper = socialAccountMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String userNameAttributeName = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = "";
        String nickname = "";
        String profileImage = "";
        String providerId = "";
        boolean verifiedEmail = false;

        if ("google".equals(registrationId)) {
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            profileImage = (String) attributes.get("picture");
            providerId = asText(attributes.get("sub"));
            if (!Boolean.TRUE.equals(attributes.get("email_verified"))) {
                throw new OAuth2AuthenticationException("Google에서 검증된 이메일을 확인할 수 없습니다.");
            }
            verifiedEmail = true;
        } else if ("naver".equals(registrationId)) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            if (response != null) {
                email = (String) response.get("email");
                nickname = (String) response.get("name");
                profileImage = (String) response.get("profile_image");
                providerId = asText(response.get("id"));
            }
        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");
                if (!Boolean.TRUE.equals(kakaoAccount.get("is_email_valid"))
                        || !Boolean.TRUE.equals(kakaoAccount.get("is_email_verified"))) {
                    throw new OAuth2AuthenticationException("Kakao에서 검증된 이메일을 확인할 수 없습니다.");
                }
                verifiedEmail = true;
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    nickname = (String) profile.get("nickname");
                    profileImage = (String) profile.get("profile_image_url");
                }
            }
            providerId = asText(attributes.get("id"));
        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 OAuth2 공급자입니다.");
        }

        email = email == null ? "" : email.trim();
        providerId = providerId.trim();
        if (email.isEmpty()) {
            throw new OAuth2AuthenticationException("OAuth2 공급자로부터 이메일 정보를 불러올 수 없습니다.");
        }
        if (providerId.isEmpty() || providerId.length() > 100) {
            throw new OAuth2AuthenticationException("OAuth2 공급자 식별자가 올바르지 않습니다.");
        }

        String provider = registrationId.toUpperCase();
        UserDTO user = socialAccountMapper.findUserByProviderAndProviderId(provider, providerId);
        if (user == null) {
            // 이메일만 같다는 이유로 LOCAL 또는 다른 공급자 계정에 자동 연결하지 않는다.
            UserDTO existingUser = userMapper.findByEmail(email);
            if (existingUser != null) {
                // 기존 Version에서 provider_id를 저장하지 않았던 Google/Kakao 회원만
                // 검증 Email과 기존 provider가 모두 일치할 때 한 번 안전하게 backfill한다.
                if (verifiedEmail && provider.equalsIgnoreCase(existingUser.getProvider())) {
                    socialAccountMapper.insert(existingUser.getId(), provider, providerId);
                    user = existingUser;
                } else {
                    throw new OAuth2AuthenticationException(
                            "이미 가입된 이메일입니다. 기존 로그인 방식으로 계정 연결을 확인해 주세요.");
                }
            }
            if (user == null) {
                user = UserDTO.builder()
                        .email(email)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .nickname(nickname == null || nickname.isBlank() ? "소셜회원" : nickname.trim())
                        .profileImageUrl(profileImage)
                        .provider(provider)
                        .role("ROLE_USER")
                        .status("ACTIVE")
                        .build();
                userMapper.insert(user);
                socialAccountMapper.insert(user.getId(), provider, providerId);
            }
        }

        String role = user.getRole().startsWith("ROLE_") ? user.getRole() : "ROLE_" + user.getRole();
        Map<String, Object> principalAttributes = new HashMap<>(attributes);
        principalAttributes.put("petcareUserId", user.getId());

        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority(role)),
                principalAttributes,
                userNameAttributeName);
    }

    private String asText(Object value) {
        return value == null ? "" : value.toString();
    }
}

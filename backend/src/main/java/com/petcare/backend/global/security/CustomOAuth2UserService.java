package com.petcare.backend.global.security;

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

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public CustomOAuth2UserService(UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
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

        if ("google".equals(registrationId)) {
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            profileImage = (String) attributes.get("picture");
        } else if ("naver".equals(registrationId)) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            if (response != null) {
                email = (String) response.get("email");
                nickname = (String) response.get("name");
                profileImage = (String) response.get("profile_image");
            }
        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    nickname = (String) profile.get("nickname");
                    profileImage = (String) profile.get("profile_image_url");
                }
            }
        }

        if (email == null || email.isEmpty()) {
            throw new OAuth2AuthenticationException("OAuth2 공급자로부터 이메일 정보를 불러올 수 없습니다.");
        }

        UserDTO user = userMapper.findByEmail(email);
        if (user == null) {
            user = UserDTO.builder()
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .nickname(nickname != null ? nickname : "소셜회원")
                    .profileImageUrl(profileImage)
                    .provider(registrationId.toUpperCase())
                    .role("ROLE_USER")
                    .status("ACTIVE")
                    .build();
            userMapper.insert(user);
        }

        String role = user.getRole().startsWith("ROLE_") ? user.getRole() : "ROLE_" + user.getRole();

        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority(role)),
                attributes,
                userNameAttributeName);
    }
}

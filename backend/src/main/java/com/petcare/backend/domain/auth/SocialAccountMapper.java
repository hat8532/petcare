package com.petcare.backend.domain.auth;

import com.petcare.backend.domain.user.UserDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SocialAccountMapper {

    UserDTO findUserByProviderAndProviderId(@Param("provider") String provider,
                                            @Param("providerId") String providerId);

    void insert(@Param("userId") Long userId,
                @Param("provider") String provider,
                @Param("providerId") String providerId);
}

package com.petcare.backend.domain.auth;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface RefreshTokenMapper {

    void insert(@Param("userId") Long userId,
                @Param("tokenHash") String tokenHash,
                @Param("expiryDate") LocalDateTime expiryDate);

    int deleteValid(@Param("userId") Long userId,
                    @Param("tokenHash") String tokenHash,
                    @Param("now") LocalDateTime now);

    int deleteByTokenHash(@Param("tokenHash") String tokenHash);

    int deleteByUserId(@Param("userId") Long userId);

    int deleteExpired(@Param("now") LocalDateTime now);
}

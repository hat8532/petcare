package com.petcare.backend.domain.user;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    UserDTO findById(@Param("id") Long id);
    UserDTO findByEmail(@Param("email") String email);
    int countByEmail(@Param("email") String email);
    int countByNickname(@Param("nickname") String nickname);
    void insert(UserDTO user);
    void update(UserDTO user);
    void updateStatus(@Param("id") Long id, @Param("status") String status);
    void updatePassword(@Param("id") Long id, @Param("password") String password);
    int countAll();
}

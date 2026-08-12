package com.petcare.backend.domain.user;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserMapper {
    UserDTO findById(@Param("id") Long id);
    UserDTO findByEmail(@Param("email") String email);
    int countByEmail(@Param("email") String email);
    void insert(UserDTO user);
    void update(UserDTO user);
    int countAll();
}

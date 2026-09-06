package com.petcare.backend.domain.user;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserAddressMapper {
    List<UserAddressDTO> findByUserId(@Param("userId") Long userId);
    UserAddressDTO findDefaultByUserId(@Param("userId") Long userId);
    void insert(UserAddressDTO address);
    void update(UserAddressDTO address);
    int deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
    void resetDefaultByUserId(@Param("userId") Long userId);
}

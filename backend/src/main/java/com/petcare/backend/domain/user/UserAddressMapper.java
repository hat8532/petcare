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
    void deleteById(@Param("id") Long id);
    void resetDefaultByUserId(@Param("userId") Long userId);
}

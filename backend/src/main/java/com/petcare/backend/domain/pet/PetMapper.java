package com.petcare.backend.domain.pet;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PetMapper {
    List<PetDTO> findByUserId(@Param("userId") Long userId);
    PetDTO findById(@Param("id") Long id);
    void insert(PetDTO pet);
    int update(PetDTO pet);
    int deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
    int countAll();
}

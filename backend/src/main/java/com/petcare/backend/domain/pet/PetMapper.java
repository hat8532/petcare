package com.petcare.backend.domain.pet;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PetMapper {
    List<PetDTO> findByUserId(@Param("userId") Long userId);
    PetDTO findById(@Param("id") Long id);
    void insert(PetDTO pet);
    void update(PetDTO pet);
    void deleteById(@Param("id") Long id);
    int countAll();
}

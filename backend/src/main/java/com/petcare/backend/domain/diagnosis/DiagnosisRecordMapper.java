package com.petcare.backend.domain.diagnosis;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DiagnosisRecordMapper {
    DiagnosisPetContext findOwnedPet(
            @Param("petId") Long petId,
            @Param("email") String email);

    List<DiagnosisRecordDTO> findByPetIdAndOwner(
            @Param("petId") Long petId,
            @Param("email") String email,
            @Param("limit") int limit,
            @Param("offset") long offset);

    long countByPetIdAndOwner(
            @Param("petId") Long petId,
            @Param("email") String email);

    DiagnosisRecordDTO findByIdAndOwner(
            @Param("id") Long id,
            @Param("email") String email);

    void insert(DiagnosisRecordDTO record);
}

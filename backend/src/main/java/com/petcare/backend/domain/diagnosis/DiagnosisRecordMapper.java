package com.petcare.backend.domain.diagnosis;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DiagnosisRecordMapper {
    List<DiagnosisRecordDTO> findByPetId(@Param("petId") Long petId);
    DiagnosisRecordDTO findById(@Param("id") Long id);
    void insert(DiagnosisRecordDTO record);
}

package com.petcare.backend.domain.timeline;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TimelineCompareMapper {
    List<TimelineCompareDTO> findByPetId(@Param("petId") Long petId);
    void insert(TimelineCompareDTO compare);
    int countAll();
}

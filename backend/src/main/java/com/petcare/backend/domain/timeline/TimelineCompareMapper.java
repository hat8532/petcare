package com.petcare.backend.domain.timeline;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TimelineCompareMapper {
    List<TimelineCompareDTO> findByPetId(@Param("petId") Long petId);
    List<TimelineCompareDTO> findByPetIdAndUserId(@Param("petId") Long petId,
                                                  @Param("userId") Long userId);
    void insert(TimelineCompareDTO compare);
    int countAll();
}

package com.petcare.backend.domain.hospital;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HospitalBookmarkMapper {

    // 내가 이 병원을 이미 북마크했는지. 0이면 안 한 것.
    int countByUserIdAndHospitalId(@Param("userId") Long userId,
                                   @Param("hospitalId") Long hospitalId);

    // hospital_bookmarks에는 (user_id, hospital_id) 유니크 제약이 없어서
    // 그냥 INSERT하면 같은 병원이 여러 번 쌓인다. SQL에서 중복을 막는다.
    int insertIfAbsent(@Param("userId") Long userId,
                       @Param("hospitalId") Long hospitalId);

    int delete(@Param("userId") Long userId,
               @Param("hospitalId") Long hospitalId);

    // 내가 북마크한 병원 목록. 병원 정보까지 함께 가져와야 화면에 바로 뿌린다.
    List<HospitalDTO> findBookmarkedHospitals(@Param("userId") Long userId);
}

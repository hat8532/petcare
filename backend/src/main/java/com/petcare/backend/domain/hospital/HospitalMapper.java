package com.petcare.backend.domain.hospital;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HospitalMapper {
    List<HospitalDTO> findNearbyHospitals(@Param("lat") double lat,
                                         @Param("lng") double lng,
                                         @Param("isEmergency24h") Boolean isEmergency24h);
    HospitalDTO findById(@Param("id") Long id);
    void insert(HospitalDTO hospital);
    int countAll();

    // 같은 병원을 여러 번 저장하지 않게 하기 위해 이름+주소로 먼저 찾아본다.
    HospitalDTO findByNameAndAddress(@Param("name") String name,
                                     @Param("address") String address);
}

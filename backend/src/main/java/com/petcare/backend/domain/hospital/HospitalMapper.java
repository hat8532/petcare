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
}

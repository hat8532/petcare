package com.petcare.backend.domain.hospital;

import com.petcare.backend.global.hospital.NaverLocalSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hospitals")
@CrossOrigin(origins = "*")
public class HospitalController {

    private final HospitalMapper hospitalMapper;
    private final NaverLocalSearchService naverLocalSearchService;

    public HospitalController(HospitalMapper hospitalMapper,
                              NaverLocalSearchService naverLocalSearchService) {
        this.hospitalMapper = hospitalMapper;
        this.naverLocalSearchService = naverLocalSearchService;
    }

    @GetMapping("/nearby")
    public ResponseEntity<Map<String, Object>> getNearbyHospitals(
            @RequestParam(name = "lat", defaultValue = "37.5507") double lat,
            @RequestParam(name = "lng", defaultValue = "126.9408") double lng,
            @RequestParam(name = "isEmergency24h", required = false) Boolean isEmergency24h,
            @RequestParam(name = "region", required = false) String region) {

        // 병원 정보는 네이버 지역검색(검증된 출처)에서만 가져온다.
        // DB fallback을 두지 않는 이유: 과거 seed 데이터가 실존하지 않는 병원이었고
        // (네이버 검색 0건 또는 주소 불일치), 평점·영업시간·전화번호도 임의값이었다.
        // 응급 상황에 쓰이는 정보라 검증되지 않은 출처는 표시하지 않는다.
        List<HospitalDTO> hospitals = naverLocalSearchService.searchEmergencyVetHospitals(region, 5);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("source", "NAVER_LOCAL_SEARCH");
        response.put("count", hospitals.size());
        response.put("centerLat", lat);
        response.put("centerLng", lng);
        response.put("data", hospitals);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getHospitalDetail(@PathVariable("id") Long id) {
        HospitalDTO hospital = hospitalMapper.findById(id);
        if (hospital == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", "해당 동물병원을 찾을 수 없습니다.");
            return ResponseEntity.status(404).body(error);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", hospital);

        return ResponseEntity.ok(response);
    }
}

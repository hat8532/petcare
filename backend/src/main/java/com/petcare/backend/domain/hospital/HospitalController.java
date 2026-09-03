package com.petcare.backend.domain.hospital;

import com.petcare.backend.global.hospital.NaverLocalSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Comparator;
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

        // 각 병원까지의 직선 거리를 계산해 담고, 가까운 순으로 정렬한다.
        hospitals.forEach(h -> h.setDistance(distanceInKm(lat, lng, h.getLatitude(), h.getLongitude())));
        hospitals.sort(Comparator.comparing(HospitalDTO::getDistance,
                Comparator.nullsLast(Comparator.naturalOrder())));

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
    
    // 지구는 평면이 아니라 구에 가까워서 위경도 차이를 그대로 빼면 실제 거리가 안 나온다.
    // Haversine 공식은 구 위의 두 점 사이 최단 거리를 구한다.
    //
    // 좌표가 없으면(네이버가 안 준 경우) null을 돌려준다.
    // 0을 넣으면 "바로 앞 병원"으로 잘못 보이고 정렬도 맨 위로 올라간다.
    private Double distanceInKm(double fromLat, double fromLng, Double toLat, Double toLng) {
        if (toLat == null || toLng == null) return null;

        final int EARTH_RADIUS_KM = 6371;

        // 삼각함수는 라디안을 받는다. 위경도는 도(degree)라서 바꿔줘야 한다.
        double dLat = Math.toRadians(toLat - fromLat);
        double dLng = Math.toRadians(toLng - fromLng);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(fromLat)) * Math.cos(Math.toRadians(toLat))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // 소수 둘째 자리까지만 남긴다. 미터 단위 아래는 의미가 없다.
        return Math.round(EARTH_RADIUS_KM * c * 100) / 100.0;
    }


}

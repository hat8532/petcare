package com.petcare.backend.domain.hospital;

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

    public HospitalController(HospitalMapper hospitalMapper) {
        this.hospitalMapper = hospitalMapper;
    }

    @GetMapping("/nearby")
    public ResponseEntity<Map<String, Object>> getNearbyHospitals(
            @RequestParam(name = "lat", defaultValue = "37.5507") double lat,
            @RequestParam(name = "lng", defaultValue = "126.9408") double lng,
            @RequestParam(name = "isEmergency24h", required = false) Boolean isEmergency24h) {

        List<HospitalDTO> hospitals = hospitalMapper.findNearbyHospitals(lat, lng, isEmergency24h);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
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

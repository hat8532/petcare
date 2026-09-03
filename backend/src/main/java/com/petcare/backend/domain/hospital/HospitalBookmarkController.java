package com.petcare.backend.domain.hospital;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 단골 동물병원 북마크.
//   POST /api/v1/hospitals/{hospitalId}/bookmark   등록/해제 토글
//   GET  /api/v1/hospitals/bookmarks               내 목록
//
// 병원 정보는 네이버 지역검색에서 실시간으로 가져오므로 우리 DB에 없는 경우가 많다.
// 그래서 북마크할 때 화면이 병원 정보를 함께 보내고, 서버가 hospitals에 저장한 뒤
// 그 id로 북마크를 건다. 이미 저장된 병원이면 그 id를 재사용한다.
//
// DB에 없는 병원은 hospitalId 자리에 0을 보낸다.
@RestController
@RequestMapping("/api/v1/hospitals")
@CrossOrigin(origins = "*")
public class HospitalBookmarkController {

    private final HospitalBookmarkMapper hospitalBookmarkMapper;
    private final HospitalMapper hospitalMapper;
    private final UserMapper userMapper;

    public HospitalBookmarkController(HospitalBookmarkMapper hospitalBookmarkMapper,
                                      HospitalMapper hospitalMapper,
                                      UserMapper userMapper) {
        this.hospitalBookmarkMapper = hospitalBookmarkMapper;
        this.hospitalMapper = hospitalMapper;
        this.userMapper = userMapper;
    }

    // 내 북마크 목록.
    //
    // SecurityConfig 는 GET /api/v1/hospitals/** 를 permitAll 로 열어 두었다.
    // 남의 북마크를 보면 안 되므로 여기서 직접 401 로 끊는다.
    //
    // 주소가 "/{id}" 와 겹쳐 보이지만 Spring 은 고정 경로("bookmarks")를
    // 변수 경로("{id}")보다 먼저 맞추므로 충돌하지 않는다.
    @GetMapping("/bookmarks")
    public ResponseEntity<Map<String, Object>> getMyBookmarks(Authentication authentication) {
        Long userId = resolveUserId(authentication);
        if (userId == null) {
            return error(401, "로그인이 필요합니다.");
        }

        List<HospitalDTO> hospitals = hospitalBookmarkMapper.findBookmarkedHospitals(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", hospitals.size());
        response.put("data", hospitals);

        return ResponseEntity.ok(response);
    }

    // 같은 주소로 누르면 담기고 다시 누르면 빠진다.
    // "등록"과 "해제"를 따로 두면 화면이 현재 상태를 먼저 알아야 하는데,
    // 그 사이에 상태가 바뀌면 어긋난다. 서버가 현재 상태를 보고 뒤집는 편이 안전하다.
    @PostMapping("/{hospitalId}/bookmark")
    public ResponseEntity<Map<String, Object>> toggleBookmark(@PathVariable("hospitalId") Long hospitalId,
                                                              @RequestBody(required = false) HospitalDTO hospital,
                                                              Authentication authentication) {
        Long userId = resolveUserId(authentication);
        if (userId == null) {
            return error(401, "로그인이 필요합니다.");
        }

        Long targetId = resolveHospitalId(hospitalId, hospital);
        if (targetId == null) {
            return error(400, "병원 정보가 없어 북마크할 수 없습니다.");
        }

        boolean already = hospitalBookmarkMapper.countByUserIdAndHospitalId(userId, targetId) > 0;
        if (already) {
            hospitalBookmarkMapper.delete(userId, targetId);
        } else {
            hospitalBookmarkMapper.insertIfAbsent(userId, targetId);
        }

        boolean bookmarked = !already;

        Map<String, Object> data = new HashMap<>();
        data.put("hospitalId", targetId);
        data.put("bookmarked", bookmarked);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", bookmarked ? "북마크에 담았습니다." : "북마크에서 뺐습니다.");
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    // 북마크를 걸 병원의 id를 정한다.
    //
    // 1. 이미 DB에 있는 병원이면 그 id를 그대로 쓴다.
    // 2. 네이버에서 온 병원이면 이름+주소로 찾아보고, 없으면 새로 저장한다.
    //    찾아보지 않고 무조건 저장하면 같은 병원이 사람 수만큼 쌓인다.
    private Long resolveHospitalId(Long hospitalId, HospitalDTO hospital) {
        if (hospitalId != null && hospitalId > 0 && hospitalMapper.findById(hospitalId) != null) {
            return hospitalId;
        }

        if (hospital == null || isBlank(hospital.getName()) || isBlank(hospital.getAddress())) {
            return null;
        }

        HospitalDTO existing = hospitalMapper.findByNameAndAddress(
                hospital.getName(), hospital.getAddress());
        if (existing != null) {
            return existing.getId();
        }

        // 화면이 보낸 값을 그대로 믿지 않고 저장할 항목을 직접 고른다.
        // 평점·리뷰수·영업시간은 네이버 지역검색이 주지 않는 값이라 담지 않는다.
        // 예전에 임의로 채워 넣은 병원 데이터가 문제가 됐던 적이 있다.
        HospitalDTO toSave = HospitalDTO.builder()
                .name(hospital.getName())
                .address(hospital.getAddress())
                .phone(hospital.getPhone())
                .latitude(hospital.getLatitude())
                .longitude(hospital.getLongitude())
                .isEmergency24h(hospital.getIsEmergency24h())
                .naverPlaceUrl(hospital.getNaverPlaceUrl())
                .isActive(true)
                .build();

        hospitalMapper.insert(toSave);
        return toSave.getId();
    }

    // 로그인한 사용자의 id. 확인할 수 없으면 null.
    // JwtAuthenticationFilter가 principal에 email을 담으므로 email로 찾는다.
    private Long resolveUserId(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }

        UserDTO currentUser = userMapper.findByEmail(authentication.getName());
        return (currentUser != null) ? currentUser.getId() : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private ResponseEntity<Map<String, Object>> error(int httpStatus, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "ERROR");
        body.put("message", message);
        return ResponseEntity.status(httpStatus).body(body);
    }
}

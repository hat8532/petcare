package com.petcare.backend.domain.timeline;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/timelines")
public class TimelineController {

    private final TimelineCompareMapper timelineCompareMapper;
    private final UserMapper userMapper;

    public TimelineController(TimelineCompareMapper timelineCompareMapper, UserMapper userMapper) {
        this.timelineCompareMapper = timelineCompareMapper;
        this.userMapper = userMapper;
    }

    @GetMapping("/pet/{petId}")
    public ResponseEntity<Map<String, Object>> getTimelineByPet(
            @PathVariable("petId") Long petId,
            Authentication authentication
    ) {
        UserDTO currentUser = getAuthenticatedUser(authentication);
        if (currentUser == null || currentUser.getId() == null) {
            return error(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.");
        }

        List<TimelineCompareDTO> list = isAdmin(currentUser)
                ? timelineCompareMapper.findByPetId(petId)
                : timelineCompareMapper.findByPetIdAndUserId(petId, currentUser.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", list.size());
        response.put("data", list.isEmpty() ? null : list.get(0));

        return ResponseEntity.ok(response);
    }

    private UserDTO getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())
                || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return userMapper.findByEmail(authentication.getName());
    }

    private boolean isAdmin(UserDTO user) {
        return "ROLE_ADMIN".equalsIgnoreCase(user.getRole());
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAIL");
        response.put("message", message);
        return ResponseEntity.status(status).body(response);
    }
}

package com.petcare.backend.domain.timeline;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/timelines")
@CrossOrigin(origins = "*")
public class TimelineController {

    private final TimelineCompareMapper timelineCompareMapper;

    public TimelineController(TimelineCompareMapper timelineCompareMapper) {
        this.timelineCompareMapper = timelineCompareMapper;
    }

    @GetMapping("/pet/{petId}")
    public ResponseEntity<Map<String, Object>> getTimelineByPet(@PathVariable("petId") Long petId) {
        List<TimelineCompareDTO> list = timelineCompareMapper.findByPetId(petId);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", list.size());
        response.put("data", list.isEmpty() ? null : list.get(0));

        return ResponseEntity.ok(response);
    }
}

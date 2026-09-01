package com.petcare.backend.domain.community;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/community")
@CrossOrigin(origins = "*")
public class CommunityController {

    // 로그인 연동 전까지 사용할 기본 작성자/반려동물 (씨앗 데이터의 초코마미·초코)
    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long DEFAULT_PET_ID = 1L;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final CommunityPostMapper communityPostMapper;

    public CommunityController(CommunityPostMapper communityPostMapper) {
        this.communityPostMapper = communityPostMapper;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCommunityPosts() {
        List<CommunityPostDTO> posts = communityPostMapper.findAll();
        posts.forEach(this::applyTimeAgo);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", posts.size());
        response.put("data", posts);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCommunityPostDetail(@PathVariable("id") Long id) {
        CommunityPostDTO post = communityPostMapper.findById(id);
        if (post == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", "해당 게시글을 찾을 수 없습니다.");
            return ResponseEntity.status(404).body(error);
        }
        applyTimeAgo(post);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", post);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPost(@RequestBody CommunityPostDTO post) {
        // 로그인 연동 전이라 작성자를 기본값으로 채운다
        if (post.getUserId() == null) post.setUserId(DEFAULT_USER_ID);
        if (post.getPetId() == null) post.setPetId(DEFAULT_PET_ID);

        communityPostMapper.insert(post);

        // 저장 직후 다시 조회해서 JOIN으로 채워진 작성자·반려동물 정보까지 내려준다
        CommunityPostDTO saved = communityPostMapper.findById(post.getId());
        applyTimeAgo(saved);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "커뮤니티 게시글이 성공적으로 작성되었습니다.");
        response.put("data", saved);

        return ResponseEntity.ok(response);
    }

    // createdAt을 "방금 전", "3분 전" 같은 표시 문구로 바꾼다.
    // 예전에는 이 문구를 DB에 저장해서 시간이 지나도 그대로였다.
    private void applyTimeAgo(CommunityPostDTO post) {
        if (post == null || post.getCreatedAt() == null) return;

        long minutes = Duration.between(post.getCreatedAt(), LocalDateTime.now()).toMinutes();
        if (minutes < 0) minutes = 0;

        if (minutes < 1) {
            post.setTimeAgo("방금 전");
        } else if (minutes < 60) {
            post.setTimeAgo(minutes + "분 전");
        } else if (minutes < 60 * 24) {
            post.setTimeAgo((minutes / 60) + "시간 전");
        } else if (minutes < 60 * 24 * 7) {
            post.setTimeAgo((minutes / (60 * 24)) + "일 전");
        } else {
            post.setTimeAgo(post.getCreatedAt().format(DATE_FORMAT));
        }
    }
}

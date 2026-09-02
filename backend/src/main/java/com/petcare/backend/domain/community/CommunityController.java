package com.petcare.backend.domain.community;

import com.petcare.backend.domain.pet.PetDTO;
import com.petcare.backend.domain.pet.PetMapper;
import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    // 비로그인 상태에서 글을 쓸 때 사용할 기본 작성자/반려동물 (씨앗 데이터의 초코마미·초코).
    // POST /api/v1/community 는 현재 비로그인도 허용되어 있어 폴백이 필요하다.
    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long DEFAULT_PET_ID = 1L;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final CommunityPostMapper communityPostMapper;
    private final UserMapper userMapper;
    private final PetMapper petMapper;

    public CommunityController(CommunityPostMapper communityPostMapper,
                               UserMapper userMapper,
                               PetMapper petMapper) {
        this.communityPostMapper = communityPostMapper;
        this.userMapper = userMapper;
        this.petMapper = petMapper;
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
    public ResponseEntity<Map<String, Object>> createPost(@RequestBody CommunityPostDTO post,
                                                          Authentication authentication) {
        // 작성자는 요청 본문이 아니라 인증 정보에서 결정한다.
        // 클라이언트가 보낸 userId를 그대로 믿으면 다른 사람 이름으로 글을 쓸 수 있다.
        Long authorId = resolveAuthorId(authentication);
        post.setUserId(authorId);
        post.setPetId(resolvePetId(authorId));

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

    // 로그인했으면 그 사용자의 id를, 아니면 기본 작성자를 돌려준다.
    // JwtAuthenticationFilter가 principal에 email을 담으므로 email로 사용자를 찾는다.
    private Long resolveAuthorId(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return DEFAULT_USER_ID;
        }

        UserDTO currentUser = userMapper.findByEmail(authentication.getName());
        return (currentUser != null && currentUser.getId() != null)
                ? currentUser.getId()
                : DEFAULT_USER_ID;
    }

    // 작성자가 등록한 첫 번째 반려동물을 글에 붙인다. 없으면 기본값.
    private Long resolvePetId(Long userId) {
        if (userId == null) return DEFAULT_PET_ID;

        List<PetDTO> pets = petMapper.findByUserId(userId);
        if (pets == null || pets.isEmpty()) return DEFAULT_PET_ID;

        return pets.get(0).getId();
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

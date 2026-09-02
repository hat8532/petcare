package com.petcare.backend.domain.community;

import com.petcare.backend.domain.pet.PetDTO;
import com.petcare.backend.domain.pet.PetMapper;
import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/community")
@CrossOrigin(origins = "*")
public class CommunityController {

    // 인증 정보를 찾지 못했을 때 사용할 기본 작성자/반려동물 (씨앗 데이터의 초코마미·초코).
    // SecurityConfig 에서 POST /api/v1/community 를 인증 필수로 막고 있어
    // 평소에는 쓰이지 않지만, 설정이 바뀌었을 때 예외로 터지지 않도록 남겨 둔다.
    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long DEFAULT_PET_ID = 1L;

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

    // 로그인한 사용자의 id를 돌려준다.
    // JwtAuthenticationFilter 가 principal 에 email 을 담으므로 email 로 사용자를 찾는다.
    //
    // 아래 비인증 분기는 SecurityConfig 가 POST 를 막고 있어 평소에는 실행되지 않는다.
    // 설정이 바뀌어 인증 없이 들어오더라도 NullPointerException 대신
    // 기본 작성자로 처리하기 위한 안전장치다.
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

    // 표시 문구 계산은 댓글과 공유하려고 TimeAgoFormatter로 옮겼다.
    private void applyTimeAgo(CommunityPostDTO post) {
        if (post == null) return;
        post.setTimeAgo(TimeAgoFormatter.format(post.getCreatedAt()));
    }
}

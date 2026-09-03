package com.petcare.backend.domain.community;

import com.petcare.backend.domain.diagnosis.DiagnosisRecordMapper;
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

    // 첨부하려는 리포트가 정말 본인 것인지 확인할 때만 쓴다. 조회 전용이다.
    private final DiagnosisRecordMapper diagnosisRecordMapper;

    public CommunityController(CommunityPostMapper communityPostMapper,
                               UserMapper userMapper,
                               PetMapper petMapper,
                               DiagnosisRecordMapper diagnosisRecordMapper) {
        this.communityPostMapper = communityPostMapper;
        this.userMapper = userMapper;
        this.petMapper = petMapper;
        this.diagnosisRecordMapper = diagnosisRecordMapper;
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

    // 글쓰기 화면에서 첨부할 리포트를 고르라고 내려주는 목록.
    //
    // 주소가 "/{id}" 와 겹쳐 보이지만 Spring 은 고정 경로("my-reports")를
    // 변수 경로("{id}")보다 먼저 맞춰보므로 충돌하지 않는다.
    //
    // SecurityConfig 는 GET /api/v1/community/** 를 permitAll 로 열어 두었다.
    // 내 리포트 목록은 남이 보면 안 되므로 여기서 직접 401 로 끊는다.
    @GetMapping("/my-reports")
    public ResponseEntity<Map<String, Object>> getMyAttachableReports(Authentication authentication) {
        String email = resolveEmail(authentication);
        if (email == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", "로그인이 필요합니다.");
            return ResponseEntity.status(401).body(error);
        }

        List<AttachableReportDTO> reports = communityPostMapper.findAttachableReports(email);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", reports.size());
        response.put("data", reports);

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

        // 첨부 리포트도 요청 본문에서 그대로 받으면 안 된다.
        // id만 바꿔 보내면 남의 진단 결과를 내 글에 붙일 수 있다.
        if (post.getDiagnosisRecordId() != null) {
            String email = resolveEmail(authentication);

            // findByIdAndOwner 는 diagnosis_records -> pets -> users 를 타고 올라가
            // email 이 일치할 때만 행을 돌려준다. null 이면 내 것이 아니다.
            boolean mine = email != null
                    && diagnosisRecordMapper.findByIdAndOwner(post.getDiagnosisRecordId(), email) != null;

            if (!mine) {
                Map<String, Object> error = new HashMap<>();
                error.put("status", "ERROR");
                error.put("message", "본인의 진단 리포트만 첨부할 수 있습니다.");
                return ResponseEntity.status(403).body(error);
            }
        }

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

    // 인증 정보에서 이메일을 꺼낸다. 확인할 수 없으면 null.
    // 진단 도메인의 조회 메서드들이 email 을 기준으로 소유자를 거르기 때문에
    // id 가 아니라 email 이 필요하다.
    private String resolveEmail(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }

        String email = authentication.getName();
        return (email == null || email.isBlank()) ? null : email;
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

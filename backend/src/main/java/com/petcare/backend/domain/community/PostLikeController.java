package com.petcare.backend.domain.community;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

// 좋아요도 댓글처럼 게시글 아래에 둔다.
//   GET  /api/v1/community/{postId}/likes   개수와 내가 눌렀는지
//   POST /api/v1/community/{postId}/likes   토글 (누름 <-> 취소)
@RestController
@RequestMapping("/api/v1/community/{postId}/likes")
@CrossOrigin(origins = "*")
public class PostLikeController {

    private final PostLikeMapper postLikeMapper;
    private final CommunityPostMapper communityPostMapper;
    private final UserMapper userMapper;

    public PostLikeController(PostLikeMapper postLikeMapper,
                              CommunityPostMapper communityPostMapper,
                              UserMapper userMapper) {
        this.postLikeMapper = postLikeMapper;
        this.communityPostMapper = communityPostMapper;
        this.userMapper = userMapper;
    }

    // 로그인하지 않아도 개수는 볼 수 있다. 이때 liked는 항상 false다.
    @GetMapping
    public ResponseEntity<Map<String, Object>> getLikes(@PathVariable("postId") Long postId,
                                                        Authentication authentication) {
        if (communityPostMapper.findById(postId) == null) {
            return error(404, "해당 게시글을 찾을 수 없습니다.");
        }

        Long userId = resolveUserId(authentication);
        boolean liked = userId != null && postLikeMapper.countByPostIdAndUserId(postId, userId) > 0;

        return ok(postLikeMapper.countByPostId(postId), liked, null);
    }

    // 같은 주소로 누르면 켜지고 다시 누르면 꺼진다.
    // "좋아요 등록"과 "취소"를 따로 두면 화면이 현재 상태를 먼저 알아야 하는데,
    // 그 사이에 상태가 바뀌면 어긋난다. 서버가 현재 상태를 보고 뒤집는 편이 안전하다.
    @PostMapping
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable("postId") Long postId,
                                                          Authentication authentication) {
        Long userId = resolveUserId(authentication);
        if (userId == null) {
            return error(401, "로그인이 필요합니다.");
        }

        if (communityPostMapper.findById(postId) == null) {
            return error(404, "해당 게시글을 찾을 수 없습니다.");
        }

        boolean alreadyLiked = postLikeMapper.countByPostIdAndUserId(postId, userId) > 0;
        if (alreadyLiked) {
            postLikeMapper.delete(postId, userId);
        } else {
            postLikeMapper.insertIfAbsent(postId, userId);
        }

        // 바뀐 뒤의 개수를 다시 세어 내려준다. 화면이 직접 +1 / -1 하면
        // 그 사이 다른 사람이 누른 값과 어긋난다.
        boolean liked = !alreadyLiked;
        return ok(postLikeMapper.countByPostId(postId), liked,
                liked ? "좋아요를 눌렀습니다." : "좋아요를 취소했습니다.");
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

    private ResponseEntity<Map<String, Object>> ok(int count, boolean liked, String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("count", count);
        data.put("liked", liked);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        if (message != null) response.put("message", message);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    private ResponseEntity<Map<String, Object>> error(int httpStatus, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "ERROR");
        body.put("message", message);
        return ResponseEntity.status(httpStatus).body(body);
    }
}

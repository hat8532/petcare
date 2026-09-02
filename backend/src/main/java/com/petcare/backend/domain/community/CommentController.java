package com.petcare.backend.domain.community;

import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 댓글은 항상 특정 게시글에 딸려 있으므로 주소도 게시글 아래에 둔다.
//   GET    /api/v1/community/{postId}/comments
//   POST   /api/v1/community/{postId}/comments
//   DELETE /api/v1/community/{postId}/comments/{commentId}
@RestController
@RequestMapping("/api/v1/community/{postId}/comments")
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentMapper commentMapper;
    private final CommunityPostMapper communityPostMapper;
    private final UserMapper userMapper;

    public CommentController(CommentMapper commentMapper,
                             CommunityPostMapper communityPostMapper,
                             UserMapper userMapper) {
        this.commentMapper = commentMapper;
        this.communityPostMapper = communityPostMapper;
        this.userMapper = userMapper;
    }

    // 댓글 목록. 로그인하지 않아도 읽을 수 있다.
    @GetMapping
    public ResponseEntity<Map<String, Object>> getComments(@PathVariable("postId") Long postId) {
        if (communityPostMapper.findById(postId) == null) {
            return error(404, "해당 게시글을 찾을 수 없습니다.");
        }

        List<CommentDTO> comments = commentMapper.findByPostId(postId);
        comments.forEach(this::applyTimeAgo);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", comments.size());
        response.put("data", comments);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createComment(@PathVariable("postId") Long postId,
                                                             @RequestBody CommentDTO comment,
                                                             Authentication authentication) {
        Long authorId = resolveUserId(authentication);
        if (authorId == null) {
            return error(401, "로그인이 필요합니다.");
        }

        if (comment.getContent() == null || comment.getContent().isBlank()) {
            return error(400, "댓글 내용을 입력해주세요.");
        }

        // 없는 게시글에 댓글을 달면 DB 외래키에서 걸려 500이 난다.
        // 그 전에 확인해서 이유를 알 수 있는 404로 돌려준다.
        if (communityPostMapper.findById(postId) == null) {
            return error(404, "해당 게시글을 찾을 수 없습니다.");
        }

        // 작성자와 대상 게시글은 요청 본문이 아니라 서버가 정한다.
        // 클라이언트가 보낸 userId를 믿으면 다른 사람 이름으로 댓글을 쓸 수 있다.
        comment.setUserId(authorId);
        comment.setPostId(postId);
        comment.setParentId(null);

        commentMapper.insert(comment);

        // 저장 직후 다시 조회해서 JOIN으로 채워진 작성자 이름까지 내려준다.
        CommentDTO saved = commentMapper.findById(comment.getId());
        applyTimeAgo(saved);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "댓글이 등록되었습니다.");
        response.put("data", saved);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Map<String, Object>> deleteComment(@PathVariable("postId") Long postId,
                                                             @PathVariable("commentId") Long commentId,
                                                             Authentication authentication) {
        Long requesterId = resolveUserId(authentication);
        if (requesterId == null) {
            return error(401, "로그인이 필요합니다.");
        }

        CommentDTO target = commentMapper.findById(commentId);

        // 주소의 postId와 실제 댓글의 postId가 다르면 잘못된 주소다.
        if (target == null || !postId.equals(target.getPostId())) {
            return error(404, "해당 댓글을 찾을 수 없습니다.");
        }

        // 지워진 행 수가 0이면 남의 댓글이라 조건에 걸리지 않은 것이다.
        int deleted = commentMapper.deleteByIdAndUserId(commentId, requesterId);
        if (deleted == 0) {
            return error(403, "본인이 작성한 댓글만 삭제할 수 있습니다.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "댓글이 삭제되었습니다.");

        return ResponseEntity.ok(response);
    }

    // 로그인한 사용자의 id를 돌려준다. 확인할 수 없으면 null.
    // JwtAuthenticationFilter가 principal에 email을 담으므로 email로 사용자를 찾는다.
    //
    // 게시글 쪽(CommunityController)은 씨앗 데이터 때문에 기본 작성자로 넘어가는
    // 분기를 남겨 두었지만, 댓글은 처음부터 인증을 전제로 만들어 그럴 이유가 없다.
    // 여기서는 확인이 안 되면 401로 끊는다.
    private Long resolveUserId(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }

        UserDTO currentUser = userMapper.findByEmail(authentication.getName());
        return (currentUser != null) ? currentUser.getId() : null;
    }

    private void applyTimeAgo(CommentDTO comment) {
        if (comment == null) return;
        comment.setTimeAgo(TimeAgoFormatter.format(comment.getCreatedAt()));
    }

    private ResponseEntity<Map<String, Object>> error(int httpStatus, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "ERROR");
        body.put("message", message);
        return ResponseEntity.status(httpStatus).body(body);
    }
}

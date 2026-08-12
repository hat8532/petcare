package com.petcare.backend.domain.community;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/community")
@CrossOrigin(origins = "*")
public class CommunityController {

    private final CommunityPostMapper communityPostMapper;

    public CommunityController(CommunityPostMapper communityPostMapper) {
        this.communityPostMapper = communityPostMapper;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCommunityPosts() {
        List<CommunityPostDTO> posts = communityPostMapper.findAll();

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", posts.size());
        response.put("data", posts);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPost(@RequestBody CommunityPostDTO post) {
        if (post.getAuthorName() == null) post.setAuthorName("초코마미");
        if (post.getTimeAgo() == null) post.setTimeAgo("방금 전");
        if (post.getCommentsCount() == null) post.setCommentsCount(0);
        if (post.getLikesCount() == null) post.setLikesCount(0);

        communityPostMapper.insert(post);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "커뮤니티 게시글이 성공적으로 작성되었습니다.");
        response.put("data", post);

        return ResponseEntity.ok(response);
    }
}

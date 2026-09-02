package com.petcare.backend.domain.community;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDTO {
    private Long id;
    private Long postId;

    // comments 테이블은 작성자를 id로 저장한다 (authorName은 조회 시 users와 JOIN해서 채움)
    private Long userId;
    private String authorName;

    // 대댓글용. 지금은 화면에서 쓰지 않고 항상 null이지만 테이블에 컬럼이 있어 함께 받아둔다.
    private Long parentId;

    private String content;

    // 게시글과 마찬가지로 "3분 전" 문구는 저장하지 않고 createdAt으로 Controller에서 계산한다.
    private String timeAgo;
    private LocalDateTime createdAt;
}

package com.petcare.backend.domain.community;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityPostDTO {
    private Long id;
    // posts 테이블은 작성자/반려동물을 id로 저장한다 (authorName, petInfo는 조회 시 JOIN으로 채움)
    private Long userId;
    private Long petId;
    private String authorName;
    private String petInfo;
    private String title;
    private String attachedReport;
    private String content;
    private Integer commentsCount;
    private Integer likesCount;
    private String timeAgo;
    private LocalDateTime createdAt;
}

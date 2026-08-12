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

package com.petcare.backend.domain.news;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsDTO {
    private Long id;
    private String category;
    private String badgeClass;
    private String title;
    private String description;
    private String publishedDate;
    private String source;
    private String newsUrl;
    private LocalDateTime createdAt;
}

package com.petcare.backend.domain.community;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

// createdAt을 "방금 전", "3분 전" 같은 표시 문구로 바꾼다.
// 게시글과 댓글이 같은 규칙을 쓰도록 한곳에 모아두었다.
// 이 문구를 DB에 저장하면 시간이 지나도 그대로여서 조회할 때마다 계산한다.
final class TimeAgoFormatter {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    // 이 클래스는 도구 모음이라 객체를 만들 필요가 없다. 생성자를 막아둔다.
    private TimeAgoFormatter() {
    }

    static String format(LocalDateTime createdAt) {
        if (createdAt == null) return null;

        // 서버 시계가 조금 앞서면 음수가 나올 수 있어 0으로 맞춘다.
        long minutes = Duration.between(createdAt, LocalDateTime.now()).toMinutes();
        if (minutes < 0) minutes = 0;

        if (minutes < 1) {
            return "방금 전";
        } else if (minutes < 60) {
            return minutes + "분 전";
        } else if (minutes < 60 * 24) {
            return (minutes / 60) + "시간 전";
        } else if (minutes < 60 * 24 * 7) {
            return (minutes / (60 * 24)) + "일 전";
        } else {
            // 일주일이 넘으면 "8일 전"보다 날짜가 읽기 쉽다.
            return createdAt.format(DATE_FORMAT);
        }
    }
}

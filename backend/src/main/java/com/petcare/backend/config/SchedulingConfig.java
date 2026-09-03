package com.petcare.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// @Scheduled 를 쓰려면 이 설정이 있어야 한다. 없으면 메서드에 붙여도 그냥 실행되지 않는다.
//
// 메인 클래스(BackendApplication)에 @EnableScheduling 을 붙여도 되지만
// 그 파일은 모든 담당자가 건드리는 곳이라 별도 설정 클래스로 뺐다.
@Configuration
@EnableScheduling
public class SchedulingConfig {
}

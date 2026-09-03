package com.petcare.backend.domain.community;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PostLikeMapper {

    int countByPostId(Long postId);

    // 내가 이미 눌렀는지. 0이면 안 누른 것.
    int countByPostIdAndUserId(@Param("postId") Long postId, @Param("userId") Long userId);

    // post_likes에는 (post_id, user_id) 유니크 제약이 없어서 그냥 INSERT하면
    // 같은 사람이 여러 번 눌렀을 때 행이 쌓인다. SQL에서 중복을 막는다.
    int insertIfAbsent(@Param("postId") Long postId, @Param("userId") Long userId);

    int delete(@Param("postId") Long postId, @Param("userId") Long userId);
}

package com.petcare.backend.domain.community;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface CommentMapper {

    // 한 게시글의 댓글을 오래된 순으로 가져온다.
    List<CommentDTO> findByPostId(Long postId);

    // 삭제 전에 "이 댓글이 정말 이 사람 것인가"를 확인하려고 한 건만 조회한다.
    CommentDTO findById(Long id);

    void insert(CommentDTO comment);

    // 남의 댓글을 지우지 못하도록 id와 userId를 함께 조건에 넣는다.
    // 조건이 안 맞으면 0을 돌려주므로 Controller에서 그 값으로 판단할 수 있다.
    int deleteByIdAndUserId(Long id, Long userId);
}

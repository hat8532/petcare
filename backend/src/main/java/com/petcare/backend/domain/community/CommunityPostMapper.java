package com.petcare.backend.domain.community;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CommunityPostMapper {
    List<CommunityPostDTO> findAll();
    void insert(CommunityPostDTO post);
    int countAll();
    CommunityPostDTO findById(Long id);

    // 글쓰기 화면에서 첨부할 리포트를 고르라고 보여줄 목록.
    // 남의 리포트가 섞이면 안 되므로 반드시 email로 소유자를 걸러 조회한다.
    List<AttachableReportDTO> findAttachableReports(String email);

    // 수정·삭제는 댓글과 같은 방식으로 userId를 조건에 함께 건다.
    // 조건이 안 맞으면 0을 돌려주므로 Controller에서 그 값으로 판단한다.
    int updateByIdAndUserId(@Param("id") Long id,
                            @Param("userId") Long userId,
                            @Param("post") CommunityPostDTO post);

    int deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}

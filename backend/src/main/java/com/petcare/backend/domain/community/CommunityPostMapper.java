package com.petcare.backend.domain.community;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface CommunityPostMapper {
    List<CommunityPostDTO> findAll();
    void insert(CommunityPostDTO post);
    int countAll();
}

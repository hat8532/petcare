package com.petcare.backend.domain.news;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface NewsMapper {
    List<NewsDTO> findAll();
    void insert(NewsDTO news);
    int countAll();
}

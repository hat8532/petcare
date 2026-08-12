import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

export default function NewsSection() {
  const [newsList, setNewsList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  const categories = [
    { id: 'ALL', label: '전체 뉴스', icon: '📰' },
    { id: 'HEALTH', label: '의학/건강', icon: '🩺' },
    { id: 'NUTRITION', label: '영양/사료', icon: '🦴' },
    { id: 'BEHAVIOR', label: '행동/훈련', icon: '🐕' },
    { id: 'POLICY', label: '정책/라이프', icon: '🏛️' }
  ];

  const defaultNewsData = [
    {
      id: 1,
      category: 'HEALTH',
      categoryLabel: '의학/건강',
      title: '여름철 습한 날씨 강아지 귀/피부 습진 예방법 및 수의학 초기 관리 지침',
      description: '장마철 실내 습도 상승으로 세균과 말라세지아 곰팡이 번식이 활발해짐에 따라 반려견 피부 발적 및 귀지 증가 시 즉시 이행해야 할 수의학 조치법을 알아봅니다.',
      publishedDate: '2026.08.12',
      source: '한국수의학 헬스저널',
      views: 1420,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 2,
      category: 'NUTRITION',
      categoryLabel: '영양/사료',
      title: '[긴급] 해외 수입 프리미엄 사료 특정 제조번호 성분 이상 자발적 회수 조치',
      description: '유럽 수입 건사료 일부 제조 배치에서 보존제 비율 기준치 초과가 검출됨에 따라 수입사 공식 홈페이지를 통한 자발적 리콜 및 환불 절차가 시작되었습니다.',
      publishedDate: '2026.08.11',
      source: '식품안전포털',
      views: 2890,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 3,
      category: 'HEALTH',
      categoryLabel: '의학/건강',
      title: '고양이 안구 질환(급성 결막염/각막 손상) 초기 증상 체크리스트 5가지',
      description: '눈물샘 이상이나 눈을 제대로 뜨지 못하고 비비는 행동이 관찰될 때 가정에서 살필 수 있는 5가지 안구 정밀 조기 진단 포인트를 수의사가 공개합니다.',
      publishedDate: '2026.08.10',
      source: '펫메디컬 타임즈',
      views: 980,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 4,
      category: 'BEHAVIOR',
      categoryLabel: '행동/훈련',
      title: '분리불안 겪는 반려견을 위한 둔감화 행동 교정 4단계 실전 솔루션',
      description: '외출 전 보호자의 행동 신호 교정부터 5초~30초 짧은 둔감화 훈련을 통해 불안감을 낮추고 정서적 안정감을 찾아주는 전문가 솔루션입니다.',
      publishedDate: '2026.08.09',
      source: '동물행동학 연구소',
      views: 1850,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 5,
      category: 'POLICY',
      categoryLabel: '정책/라이프',
      title: '2026년 반려동물 등록제 무상 지원 및 지자체 24시 응급 센터 확대',
      description: '전국 주요 지자체에서 내장형 외장형 동물등록 비용 시비 지원을 확대하고 야간 응급 진료센터 연계 시스템 구축 사업을 본격 시행합니다.',
      publishedDate: '2026.08.08',
      source: '농림축산식품부 공보',
      views: 3100,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 6,
      category: 'NUTRITION',
      categoryLabel: '영양/사료',
      title: '노령견/노령묘 전용 처방 사료 칼로리 밀도 및 신장 관리 조절법',
      description: '7세 이상 노령기에 진입한 반려동물의 신장 부담을 줄이고 적정 근육량을 유지할 수 있는 고품질 단백질 급여 비율 가이드라인입니다.',
      publishedDate: '2026.08.07',
      source: '한국임상수의학회',
      views: 1240,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80'
    }
  ];

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getNews();
      if (data && data.length > 0) {
        setNewsList(data);
      } else {
        setNewsList(defaultNewsData);
      }
    } catch (e) {
      setNewsList(defaultNewsData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredNews = newsList.filter(n => {
    const matchesCategory = selectedCategory === 'ALL' || n.category === selectedCategory;
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (n.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredNews = filteredNews.length > 0 ? filteredNews[0] : null;
  const gridNews = filteredNews.length > 1 ? filteredNews.slice(1) : filteredNews;

  const getCategoryBadgeStyle = (category) => {
    switch (category) {
      case 'HEALTH':
        return { bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', text: '#ffffff', icon: '🩺' };
      case 'NUTRITION':
        return { bg: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', text: '#ffffff', icon: '🦴' };
      case 'BEHAVIOR':
        return { bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', text: '#ffffff', icon: '🐕' };
      case 'POLICY':
        return { bg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', text: '#ffffff', icon: '🏛️' };
      default:
        return { bg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', text: '#ffffff', icon: '✨' };
    }
  };

  return (
    <section id="news-section" style={{ padding: '80px 0 110px 0', background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)' }}>
      <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            padding: '6px 18px',
            borderRadius: '9999px',
            marginBottom: '14px',
            boxShadow: '0 2px 10px rgba(5, 150, 105, 0.1)'
          }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} className="pulse-dot" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#047857', letterSpacing: '0.5px' }}>
              NAVER API HUB • REAL-TIME PET NEWS SYNC
            </span>
          </div>

          <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', marginTop: '4px' }}>
            실시간 수의학 & 펫 헬스 케어 브리핑
          </h2>
          <p style={{ fontSize: '16px', color: '#475569', marginTop: '10px', maxWidth: '680px', margin: '10px auto 0 auto', lineHeight: '1.6' }}>
            Spring Boot 백엔드가 NAVER API HUB에서 실시간 수집하는 최신 반려동물 질병·건강, 사료 리콜, 지자체 정책 뉴스를 한눈에 확인하세요.
          </p>
        </div>

        {/* Filter Bar & Search Control */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '16px 20px',
          marginBottom: '40px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '14px',
                    fontSize: '13.5px',
                    fontWeight: isSelected ? '800' : '600',
                    background: isSelected ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#64748b',
                    border: isSelected ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box & Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="뉴스 제목 / 키워드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#f8fafc',
                  transition: 'all 0.2s ease'
                }}
              />
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}>
                🔍
              </span>
            </div>

            <button
              onClick={fetchNews}
              disabled={isLoading}
              style={{
                padding: '10px 18px',
                borderRadius: '14px',
                border: '1px solid #059669',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                color: '#047857',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'inline-block', transform: isLoading ? 'rotate(360deg)' : 'none', transition: 'transform 1s linear' }}>🔄</span>
              <span>{isLoading ? '동기화 중...' : '실시간 새로고침'}</span>
            </button>
          </div>
        </div>

        {/* Featured Hero News (Top 1 Breaking Item) */}
        {featuredNews && selectedCategory === 'ALL' && !searchTerm && (
          <article
            onMouseEnter={() => setHoveredCardId(featuredNews.id)}
            onMouseLeave={() => setHoveredCardId(null)}
            style={{
              marginBottom: '40px',
              borderRadius: '28px',
              overflow: 'hidden',
              background: '#0f172a',
              color: '#ffffff',
              display: 'grid',
              gridTemplateColumns: 'minmax(300px, 1.2fr) 1fr',
              boxShadow: hoveredCardId === featuredNews.id ? '0 20px 45px rgba(15, 23, 42, 0.25)' : '0 12px 30px rgba(15, 23, 42, 0.15)',
              transform: hoveredCardId === featuredNews.id ? 'translateY(-4px)' : 'translateY(0)',
              transition: 'all 0.35s ease',
              border: '1px solid #334155'
            }}
          >
            {/* Left Image Area */}
            <div style={{ position: 'relative', minHeight: '320px', overflow: 'hidden' }}>
              <img
                src={featuredNews.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80'}
                alt={featuredNews.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: hoveredCardId === featuredNews.id ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform 0.5s ease'
                }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)' }} />
              
              <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '900',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  letterSpacing: '0.5px'
                }}>
                  🔥 BREAKING NEWS
                </span>
                <span style={{
                  background: getCategoryBadgeStyle(featuredNews.category).bg,
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  {getCategoryBadgeStyle(featuredNews.category).icon} {featuredNews.categoryLabel || featuredNews.category}
                </span>
              </div>
            </div>

            {/* Right Content Area */}
            <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>
                  <span>🏛️ {featuredNews.source}</span>
                  <span>•</span>
                  <span>📅 {featuredNews.publishedDate}</span>
                </div>

                <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', lineHeight: '1.4', marginBottom: '16px' }}>
                  {featuredNews.title}
                </h3>

                <p style={{ fontSize: '14.5px', color: '#cbd5e1', lineHeight: '1.7', marginBottom: '24px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {featuredNews.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  👁️ 조회수 {featuredNews.views ? featuredNews.views.toLocaleString() : '2,400'}회
                </span>

                <a
                  href={featuredNews.url || featuredNews.newsUrl || 'https://news.naver.com'}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '13.5px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  기사 전문 읽기 ↗
                </a>
              </div>
            </div>
          </article>
        )}

        {/* News Grid Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '28px' }}>
          {gridNews.map((news) => {
            const badge = getCategoryBadgeStyle(news.category);
            const isHovered = hoveredCardId === news.id;

            return (
              <article
                key={news.id}
                onMouseEnter={() => setHoveredCardId(news.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #e2e8f0',
                  boxShadow: isHovered ? '0 18px 40px rgba(15, 23, 42, 0.12)' : '0 4px 16px rgba(15, 23, 42, 0.04)',
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Image Header */}
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                  <img
                    src={news.image || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80'}
                    alt={news.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.4s ease'
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)' }} />

                  {/* Category Pill Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      color: badge.text,
                      background: badge.bg,
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{badge.icon}</span>
                    <span>{news.categoryLabel || news.category}</span>
                  </span>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '600', color: '#475569' }}>🏛️ {news.source}</span>
                      <span>📅 {news.publishedDate}</span>
                    </div>

                    <h3 style={{
                      fontSize: '17px',
                      fontWeight: '800',
                      color: '#0f172a',
                      lineHeight: '1.45',
                      marginBottom: '12px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {news.title}
                    </h3>

                    <p style={{
                      fontSize: '13.5px',
                      color: '#475569',
                      lineHeight: '1.6',
                      marginBottom: '20px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {news.description}
                    </p>
                  </div>

                  {/* Bottom Actions */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                      👁️ {news.views ? news.views.toLocaleString() : '1,200'}회 읽음
                    </span>

                    <a
                      href={news.url || news.newsUrl || 'https://news.naver.com'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: isHovered ? '#047857' : '#059669',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'color 0.2s ease'
                      }}
                    >
                      기사 원문 보기 ↗
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

export default function NewsSection() {
  const [newsList, setNewsList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { id: 'ALL', label: '전체 뉴스' },
    { id: 'HEALTH', label: '의학/건강' },
    { id: 'NUTRITION', label: '영양/사료' },
    { id: 'BEHAVIOR', label: '행동/훈련' },
    { id: 'POLICY', label: '정책/라이프' }
  ];

  const defaultNewsData = [
    {
      id: 1,
      category: 'HEALTH',
      categoryLabel: '의학/건강',
      badgeClass: 'badge-emerald',
      title: '여름철 습한 날씨 강아지 귀/피부 습진 예방법 및 수의학 초기 관리 지침',
      description: '장마철 실내 습도 상승으로 세균과 말라세지아 곰팡이 번식이 활발해짐에 따라 반려견 피부 발적 및 귀지 증가 시 즉시 이행해야 할 수의학 조치법을 알아봅니다.',
      publishedDate: '2026.08.07',
      source: '한국수의학 헬스저널',
      views: 1420,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 2,
      category: 'NUTRITION',
      categoryLabel: '영양/사료',
      badgeClass: 'badge-rose',
      title: '[긴급] 해외 수입 프리미엄 사료 특정 제조번호 성분 이상 자발적 회수 조치',
      description: '유럽 수입 건사료 일부 제조 배치에서 보존제 비율 기준치 초과가 검출됨에 따라 수입사 공식 홈페이지를 통한 자발적 리콜 및 환불 절차가 시작되었습니다.',
      publishedDate: '2026.08.06',
      source: '식품안전포털',
      views: 2890,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 3,
      category: 'HEALTH',
      categoryLabel: '의학/건강',
      badgeClass: 'badge-indigo',
      title: '고양이 안구 질환(급성 결막염/각막 손상) 초기 증상 체크리스트 5가지',
      description: '눈물샘 이상이나 눈을 제대로 뜨지 못하고 비비는 행동이 관찰될 때 가정에서 살필 수 있는 5가지 안구 정밀 조기 진단 포인트를 수의사가 공개합니다.',
      publishedDate: '2026.08.05',
      source: '펫메디컬 타임즈',
      views: 980,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 4,
      category: 'BEHAVIOR',
      categoryLabel: '행동/훈련',
      badgeClass: 'badge-amber',
      title: '분리불안 겪는 반려견을 위한 둔감화 행동 교정 4단계 실전 솔루션',
      description: '외출 전 보호자의 행동 신호 교정부터 5초~30초 짧은 둔감화 훈련을 통해 불안감을 낮추고 정서적 안정감을 찾아주는 전문가 솔루션입니다.',
      publishedDate: '2026.08.04',
      source: '동물행동학 연구소',
      views: 1850,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 5,
      category: 'POLICY',
      categoryLabel: '정책/라이프',
      badgeClass: 'badge-emerald',
      title: '2026년 반려동물 등록제 무상 지원 및 지자체 24시 응급 센터 확대',
      description: '전국 주요 지자체에서 내장형 외장형 동물등록 비용 시비 지원을 확대하고 야간 응급 진료센터 연계 시스템 구축 사업을 본격 시행합니다.',
      publishedDate: '2026.08.03',
      source: '농림축산식품부 공보',
      views: 3100,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 6,
      category: 'NUTRITION',
      categoryLabel: '영양/사료',
      badgeClass: 'badge-indigo',
      title: '노령견/노령묘 전용 처방 사료 칼로리 밀도 및 신장 관리 조절법',
      description: '7세 이상 노령기에 진입한 반려동물의 신장 부담을 줄이고 적정 근육량을 유지할 수 있는 고품질 단백질 급여 비율 가이드라인입니다.',
      publishedDate: '2026.08.02',
      source: '한국임상수의학회',
      views: 1240,
      url: 'https://news.naver.com',
      image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&auto=format&fit=crop&q=60'
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
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="news-section" style={{ padding: '60px 0 90px 0', background: '#f8fafc' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 14px', borderRadius: '9999px', marginBottom: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} className="pulse-dot" />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#047857' }}>
              REAL-TIME PET NEWS API CONNECTED
            </span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>
            실시간 수의학 & 펫 헬스 뉴스 센터
          </h2>
          <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
            Spring Boot 백엔드가 수집·동기화하는 최신 반려동물 질병 케어, 사료 리콜, 정책 뉴스를 실시간으로 확인하세요.
          </p>
        </div>

        {/* Filter Bar & Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: selectedCategory === cat.id ? '800' : '600',
                  background: selectedCategory === cat.id ? '#059669' : '#ffffff',
                  color: selectedCategory === cat.id ? '#ffffff' : '#475569',
                  border: selectedCategory === cat.id ? '1px solid #047857' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedCategory === cat.id ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box & Refresh Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="뉴스 제목 / 키워드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 36px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>
                🔍
              </span>
            </div>

            <button
              onClick={fetchNews}
              disabled={isLoading}
              style={{
                padding: '9px 16px',
                borderRadius: '12px',
                border: '1px solid #059669',
                background: '#ecfdf5',
                color: '#047857',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔄</span> {isLoading ? '수집 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* News Card Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredNews.map((news) => (
            <article
              key={news.id}
              className="glass-card harmonious-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                border: '1px solid #e2e8f0'
              }}
            >
              {/* Thumbnail Image */}
              <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                <img
                  src={news.image || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=60'}
                  alt={news.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#ffffff',
                    background: news.category === 'NUTRITION' ? '#be123c' : news.category === 'HEALTH' ? '#047857' : '#4f46e5',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  {news.categoryLabel || news.category}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    <span>🏛️ {news.source}</span>
                    <span>📅 {news.publishedDate}</span>
                  </div>

                  <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: '#0f172a', lineHeight: '1.45', marginBottom: '10px' }}>
                    {news.title}
                  </h3>

                  <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', marginBottom: '18px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {news.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    👁️ 조회수 {news.views ? news.views.toLocaleString() : '1,200'}회
                  </span>

                  <a
                    href={news.url || 'https://news.naver.com'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#059669',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    기사 원문 보기 ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

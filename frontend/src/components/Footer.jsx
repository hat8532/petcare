import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: '#0f172a',
      borderTop: '1px solid #1e293b',
      padding: '48px 0 28px 0',
      color: '#94a3b8'
    }}>
      <div className="container">
        
        {/* Horizontal 4-Column Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr',
          gap: '32px',
          marginBottom: '36px',
          alignItems: 'start'
        }}>
          {/* Col 1: Brand & Tagline */}
          <div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', marginBottom: '12px', fontFamily: 'Outfit, sans-serif' }}>
              🐾 PetCare<span className="text-gradient-emerald">AI</span>
            </div>
            <p style={{ lineHeight: '1.6', fontSize: '12.5px', color: '#cbd5e1', maxWidth: '280px' }}>
              Generative AI & Vision AI 기반 반려동물 질병 진단 및 24시 응급 동물병원 통합 헬스케어 플랫폼
            </p>
          </div>

          {/* Col 2: Core Services */}
          <div>
            <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '14px', marginBottom: '14px' }}>주요 서비스</div>
            <ul style={{ listStyle: 'none', lineHeight: '2.1', fontSize: '12.5px', color: '#94a3b8', padding: 0, margin: 0 }}>
              <li>• AI 질병 진단 (Vision AI + Gemini)</li>
              <li>• Before/After 경과 타임라인</li>
              <li>• 위치 기반 24시 응급 동물병원 지도</li>
              <li>• 실시간 펫 헬스 뉴스 (6h 캐시)</li>
            </ul>
          </div>

          {/* Col 3: Tech Stack */}
          <div>
            <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '14px', marginBottom: '14px' }}>기술 아키텍처</div>
            <ul style={{ listStyle: 'none', lineHeight: '2.1', fontSize: '12.5px', color: '#94a3b8', padding: 0, margin: 0 }}>
              <li>• Spring Boot 3.5 & MyBatis</li>
              <li>• Google Gemini 2.0 Flash API</li>
              <li>• Custom PyTorch Vision AI</li>
              <li>• Haversine Spatial Query</li>
            </ul>
          </div>

          {/* Col 4: Emergency Center */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #1e293b', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontWeight: '800', color: '#fb7185', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚨</span> 응급 동물병원 핫라인
            </div>
            <p style={{ fontSize: '11.5px', lineHeight: '1.5', marginBottom: '10px', color: '#cbd5e1' }}>
              호흡곤란, 출혈, 각막 궤양 발생 시 지체 없이 24시 응급 센터로 이동하세요.
            </p>
            <div style={{ fontWeight: '900', color: '#f43f5e', fontSize: '16px', fontFamily: 'Outfit, sans-serif' }}>
              전국 24시 센터: 1588-0000
            </div>
          </div>
        </div>

        {/* Bottom Copyright Divider */}
        <div style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b'
        }}>
          © 2026 PetCare AI Platform. All rights reserved. 본 AI 진단 결과는 참고용이며 전문 수의사 진료를 대체할 수 없습니다.
        </div>

      </div>
    </footer>
  );
}

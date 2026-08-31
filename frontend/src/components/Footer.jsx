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
              환부 Image·증상 기록, 입력 기반 Safety Triage, 검증 가능한 AI Provider 계약을 연결하는 반려동물 헬스케어 프로젝트
            </p>
          </div>

          {/* Col 2: Core Services */}
          <div>
            <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '14px', marginBottom: '14px' }}>주요 서비스</div>
            <ul style={{ listStyle: 'none', lineHeight: '2.1', fontSize: '12.5px', color: '#94a3b8', padding: 0, margin: 0 }}>
              <li>• Image 입력·Safety Triage</li>
              <li>• Before/After 경과 타임라인</li>
              <li>• 출처 검증형 응급 병원 연결</li>
              <li>• 실시간 펫 헬스 뉴스 (6h 캐시)</li>
            </ul>
          </div>

          {/* Col 3: Tech Stack */}
          <div>
            <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '14px', marginBottom: '14px' }}>기술 아키텍처</div>
            <ul style={{ listStyle: 'none', lineHeight: '2.1', fontSize: '12.5px', color: '#94a3b8', padding: 0, margin: 0 }}>
              <li>• Spring Boot 3.5 & MyBatis</li>
              <li>• FastAPI Provider Contract</li>
              <li>• Model 평가 상태·출처 기록</li>
              <li>• Haversine Spatial Query</li>
            </ul>
          </div>

          {/* Col 4: Emergency Center */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #1e293b', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontWeight: '800', color: '#fb7185', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚨</span> 응급 상황 안내
            </div>
            <p style={{ fontSize: '11.5px', lineHeight: '1.5', marginBottom: '10px', color: '#cbd5e1' }}>
              호흡곤란, 출혈, 각막 궤양 발생 시 지체 없이 24시 응급 센터로 이동하세요.
            </p>
            <div style={{ fontWeight: '900', color: '#f43f5e', fontSize: '16px', fontFamily: 'Outfit, sans-serif' }}>
              이동 전 병원에 전화해 진료 가능 여부를 확인하세요.
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

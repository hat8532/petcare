import React from 'react';

export default function HeroSection({ onStartDiagnosis, onFindHospital, onNavigateDashboard }) {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
      padding: '76px 0 64px 0',
      borderBottom: '1px solid #f1f5f9'
    }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: '1040px', position: 'relative', zIndex: 2 }}>
        
        {/* 1. Toss/Apple Style Clean Pill Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: '#ffffff',
          border: '1px solid #a7f3d0',
          boxShadow: '0 2px 10px rgba(5, 150, 105, 0.08)',
          marginBottom: '24px'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }} className="animate-pulse-glow" />
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#047857', letterSpacing: '-0.2px' }}>
            AI 기반 반려동물 맞춤 스마트 헬스케어
          </span>
        </div>

        {/* 2. Main Bold Headline */}
        <h1 style={{
          fontSize: '46px',
          fontWeight: '900',
          lineHeight: '1.25',
          color: '#0f172a',
          marginBottom: '18px',
          letterSpacing: '-1.5px'
        }}>
          우리 아이 건강 관리,<br />
          <span style={{
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            이제 한눈에 쉽고 정확하게
          </span>
        </h1>

        {/* 3. Subtitle */}
        <p style={{
          fontSize: '17px',
          color: '#475569',
          lineHeight: '1.65',
          maxWidth: '640px',
          margin: '0 auto 36px auto',
          fontWeight: '400'
        }}>
          환부 사진을 통한 AI 질병 분석부터 실시간 바이탈 기록,<br />
          데일리 케어 체크리스트와 24시 응급병원 안내까지 한 번에 관리하세요.
        </p>

        {/* 4. Action Buttons (Toss Style) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '52px' }}>
          <button 
            onClick={onStartDiagnosis}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: '16px',
              background: '#059669',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🩺</span> AI 질병 진단 시작하기
          </button>

          <button 
            onClick={onNavigateDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 26px',
              borderRadius: '16px',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '15px',
              fontWeight: '800',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>📊</span> 스마트 대시보드
          </button>
        </div>

        {/* 5. Toss / Apple Health Live Floating Preview Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px',
          maxWidth: '960px',
          margin: '0 auto',
          textAlign: 'left'
        }}>
          
          {/* Card 1: AI Diagnosis Status */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            transition: 'transform 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🩺</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>AI 질병 진단 스튜디오</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              피부 & 안구 정밀 판독
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              환부 사진 업로드 시 의심 질환 분석 및 수의학 맞춤 소견 리포트를 즉시 생성합니다.
            </p>
          </div>

          {/* Card 2: Daily Care Routine */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            transition: 'transform 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎯</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>1초 데일리 케어 루틴</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                오늘 100%
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              매일의 필수 케어 기록
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              수분 섭취, 산책, 복약 등 우리 아이의 일상 케어를 클릭 한 번으로 간편하게 기록합니다.
            </p>
          </div>

          {/* Card 3: D-Day & 24h Hospital */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            transition: 'transform 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>⏰</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>일정 관리 & 응급 연계</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#e11d48', background: '#fff1f2', padding: '3px 8px', borderRadius: '6px' }}>
                D-Day
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              예방 접종 및 응급실 매칭
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              놓치기 쉬운 백신 일정을 알림 받고, 비상시 가장 가까운 24시 응급 동물병원과 연결됩니다.
            </p>
          </div>

        </div>

        {/* 6. Clean Subtle Trust Metrics Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '32px',
          marginTop: '44px',
          paddingTop: '28px',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>
            <span style={{ color: '#059669', fontSize: '15px' }}>✓</span> 개인 맞춤 PHR 실시간 저장
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>
            <span style={{ color: '#059669', fontSize: '15px' }}>✓</span> 수의학 임상 RAG 소견 리포트
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>
            <span style={{ color: '#059669', fontSize: '15px' }}>✓</span> 전국 24시 응급 동물병원 연동
          </div>
        </div>

      </div>
    </section>
  );
}

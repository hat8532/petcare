import React from 'react';

export default function HeroSection({ onStartDiagnosis, onFindHospital, onNavigateDashboard }) {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#fbfcfd',
      padding: '88px 0 72px 0',
      borderBottom: '1px solid rgba(226, 232, 240, 0.7)'
    }}>
      {/* 🌌 Apple Style Ambient Aurora Orbs (Soft Glows) */}
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '15%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.04) 50%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        top: '40px',
        right: '12%',
        width: '420px',
        height: '420px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <div className="container" style={{ textAlign: 'center', maxWidth: '1040px', position: 'relative', zIndex: 2 }}>
        
        {/* 1. Toss/Apple Style Clean Pill Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
          marginBottom: '26px'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#047857', letterSpacing: '-0.2px' }}>
            차세대 스마트 펫 헬스테크 플랫폼
          </span>
        </div>

        {/* 2. Main Bold Headline */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: '900',
          lineHeight: '1.24',
          color: '#0b0f19',
          marginBottom: '20px',
          letterSpacing: '-1.8px'
        }}>
          반려동물 건강 관리,<br />
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
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
          lineHeight: '1.68',
          maxWidth: '620px',
          margin: '0 auto 38px auto',
          fontWeight: '500',
          letterSpacing: '-0.3px'
        }}>
          환부 사진을 통한 AI 질병 분석부터 실시간 바이탈 기록,<br />
          데일리 케어 체크리스트와 24시 응급병원 안내까지 한 곳에서 편리하게 케어하세요.
        </p>

        {/* 4. Action Buttons (Apple / Toss Dual Style) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '56px' }}>
          <button 
            onClick={onStartDiagnosis}
            className="card-hover-lift"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 30px',
              borderRadius: '9999px',
              background: '#0b0f19',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '800',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              boxShadow: '0 8px 24px -4px rgba(11, 15, 25, 0.28)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span>🩺</span> AI 질병 진단 시작하기
          </button>

          <button 
            onClick={onNavigateDashboard}
            className="card-hover-lift"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(16px)',
              color: '#0b0f19',
              fontSize: '15px',
              fontWeight: '800',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span>📊</span> 건강 대시보드
          </button>
        </div>

        {/* 5. Apple Health Live Floating Preview Cards (Frosted Glass) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          maxWidth: '960px',
          margin: '0 auto',
          textAlign: 'left'
        }}>
          
          {/* Card 1: AI Diagnosis Status */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '26px 24px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🩺</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>AI 질병 진단 스튜디오</span>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                padding: '3px 9px',
                borderRadius: '9999px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
              }}>
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#0b0f19', marginBottom: '6px', letterSpacing: '-0.3px' }}>
              피부 & 안구 정밀 판독
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.55' }}>
              환부 사진 업로드 시 의심 질환 분석 및 수의학 맞춤 소견 리포트를 즉시 생성합니다.
            </p>
          </div>

          {/* Card 2: Daily Care Routine */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '26px 24px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🎯</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>1초 데일리 케어 루틴</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 9px', borderRadius: '9999px' }}>
                오늘 100%
              </span>
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#0b0f19', marginBottom: '6px', letterSpacing: '-0.3px' }}>
              매일의 필수 케어 기록
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.55' }}>
              수분 섭취, 산책, 복약 등 반려동물의 일상 케어를 클릭 한 번으로 간편하게 기록합니다.
            </p>
          </div>

          {/* Card 3: D-Day & 24h Hospital */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '26px 24px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>⏰</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>일정 관리 & 응급 연계</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#e11d48', background: '#fff1f2', border: '1px solid #fecdd3', padding: '3px 9px', borderRadius: '9999px' }}>
                D-Day
              </span>
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#0b0f19', marginBottom: '6px', letterSpacing: '-0.3px' }}>
              예방 접종 및 응급실 매칭
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.55' }}>
              놓치기 쉬운 백신 일정을 알림 받고, 비상시 가장 가까운 24시 응급 동물병원과 연결됩니다.
            </p>
          </div>

        </div>

        {/* 6. Clean Subtle Trust Metrics Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '36px',
          marginTop: '48px',
          paddingTop: '30px',
          borderTop: '1px solid rgba(226, 232, 240, 0.7)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>
            <span style={{ color: '#10b981', fontSize: '15px', fontWeight: '800' }}>✓</span> 개인 맞춤 PHR 실시간 저장
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>
            <span style={{ color: '#10b981', fontSize: '15px', fontWeight: '800' }}>✓</span> 수의학 임상 RAG 소견 리포트
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>
            <span style={{ color: '#10b981', fontSize: '15px', fontWeight: '800' }}>✓</span> 전국 24시 응급 동물병원 연동
          </div>
        </div>

      </div>
    </section>
  );
}


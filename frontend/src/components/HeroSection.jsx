import React from 'react';

export default function HeroSection({ onStartDiagnosis, onFindHospital, onNavigateDashboard }) {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(5, 150, 105, 0.12) 0%, rgba(13, 148, 136, 0.05) 50%, rgba(248, 250, 252, 0) 80%)',
      padding: '72px 0 60px 0',
      borderBottom: '1px solid #f1f5f9'
    }}>
      {/* Background Decorative Ambient Circles */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '700px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(255, 255, 255, 0) 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />

      <div className="container" style={{ textAlign: 'center', maxWidth: '1000px', position: 'relative', zIndex: 2 }}>
        
        {/* 1. Floating Pill Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #a7f3d0',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.1)',
          marginBottom: '28px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} className="animate-pulse-glow" />
          <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#047857', letterSpacing: '-0.01em' }}>
            Image Validation · Safety Triage · Provider Contract
          </span>
        </div>

        {/* 2. Main Title */}
        <h1 style={{
          fontSize: '52px',
          fontWeight: '900',
          lineHeight: '1.2',
          color: '#0f172a',
          marginBottom: '22px',
          letterSpacing: '-2px'
        }}>
          사진 한 장으로 시작하는<br />
          <span className="text-emerald-gradient">우리 아이 맞춤 AI 헬스 케어</span>
        </h1>

        {/* 3. Subtitle */}
        <p style={{
          fontSize: '17.5px',
          color: '#475569',
          lineHeight: '1.65',
          maxWidth: '700px',
          margin: '0 auto 40px auto',
          fontWeight: '400'
        }}>
          등록된 반려동물의 환부 Image와 증상을 기록하고,<br />
          <strong style={{ color: '#059669', fontWeight: '700' }}>입력 기반 Safety Triage</strong>와 검증된 Provider 응답을 구분해 안내합니다.
        </p>

        {/* 4. Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '56px' }}>
          <button 
            onClick={onStartDiagnosis}
            className="btn-emerald-primary"
            style={{ fontSize: '15.5px', padding: '15px 28px' }}
          >
            <span>🩺</span> AI 질병 진단 시작하기
          </button>

          <button 
            onClick={onNavigateDashboard}
            className="btn-neutral-secondary"
            style={{ fontSize: '15.5px', padding: '15px 24px', borderColor: '#4f46e5', color: '#4f46e5' }}
          >
            <span>📊</span> 반려동물 건강 대시보드
          </button>

          <button 
            onClick={onFindHospital}
            className="btn-neutral-secondary"
            style={{ fontSize: '15.5px', padding: '15px 24px' }}
          >
            <span>🏥</span> 공식 병원 검색 안내
          </button>
        </div>

        {/* 5. Live Product Preview Glass Scanner Card */}
        <div className="glass-card" style={{
          position: 'relative',
          maxWidth: '860px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Top Bar */}
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }}></span>
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '4px 14px', borderRadius: '8px' }}>
              🔒 petcare.ai/diagnosis/safety-report
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }} className="animate-pulse-glow" />
              CONTRACT CHECKED
            </div>
          </div>

          {/* Inner Content */}
          <div style={{ padding: '28px', textAlign: 'left', background: '#ffffff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'center' }}>
              
              {/* AI Scan Item */}
              <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
                <div className="animate-scan" />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>🐶</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>초코 (등록 반려동물)</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>환부·증상 입력 · Image 형식·크기 검증 완료</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '9999px' }}>
                    CAUTION (주의)
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px' }}>
                    <span style={{ color: '#0f172a' }}>AI Image 의심 소견</span>
                    <span style={{ color: '#64748b' }}>검증 결과가 있을 때만 표시</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '0%', background: 'linear-gradient(90deg, #059669, #0d9488)', borderRadius: '4px' }}></div>
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.55', margin: 0 }}>
                  <strong>Safety 안내:</strong> Provider 실패 시 질환명·확률을 만들지 않고 입력 기반 위험도와 다음 행동만 표시합니다.
                </p>
              </div>

              {/* Stats Item */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-subtle)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>AI Model 성능 평가</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>
                    평가 전 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>(Dataset 승인 대기)</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-subtle)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>응급 동물병원 정보 안전 기준</div>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍</span> 출처가 검증된 정보만 표시
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 6. Counter Stats Grid at Bottom */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>10MB</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>JPEG·PNG·WEBP 입력 제한</div>
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>3단계</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>관찰·주의·응급 Safety Triage</div>
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>5건</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>페이지별 진단 이력 조회</div>
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>20초</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Frontend 분석 timeout 안내</div>
          </div>
        </div>

      </div>
    </section>
  );
}

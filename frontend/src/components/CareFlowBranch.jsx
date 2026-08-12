import React, { useState } from 'react';

export default function CareFlowBranch() {
  const [activeBranch, setActiveBranch] = useState('A');

  return (
    <section style={{ padding: '60px 0', background: '#f8fafc' }}>
      <div className="container">
        <div className="section-header">
          <span className="badge badge-indigo" style={{ marginBottom: '12px' }}>SMART BRANCHING SYSTEM</span>
          <h2>위험도 판정에 따른 동적 헬스케어 루프</h2>
          <p>AI 진단 결과의 위험도 등급에 따라 최적의 케어 경로로 자동 안내됩니다.</p>
        </div>

        {/* Branch Toggle Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          <button
            onClick={() => setActiveBranch('A')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-lg)',
              border: activeBranch === 'A' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: activeBranch === 'A' ? '#ecfdf5' : '#ffffff',
              color: activeBranch === 'A' ? '#047857' : '#64748b',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeBranch === 'A' ? 'var(--shadow-md)' : 'none'
            }}
          >
            <span>🟢</span> 분기 A: 관찰 / 주의 코스 (경과 관찰 타임라인)
          </button>
          <button
            onClick={() => setActiveBranch('B')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-lg)',
              border: activeBranch === 'B' ? '2px solid #e11d48' : '1px solid #cbd5e1',
              background: activeBranch === 'B' ? '#fff1f2' : '#ffffff',
              color: activeBranch === 'B' ? '#be123c' : '#64748b',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeBranch === 'B' ? 'var(--shadow-md)' : 'none'
            }}
          >
            <span>🚨</span> 분기 B: 즉시 응급 코스 (24시 병원 직행)
          </button>
        </div>

        {/* Active Branch Display Card */}
        <div className="glass-card" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', background: '#ffffff' }}>
          {activeBranch === 'A' ? (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span className="badge badge-emerald" style={{ fontSize: '14px' }}>위험도: OBSERVATION / CAUTION</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>일반 습진, 경미한 피부염, 부종</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>
                가정 내 소독 케어 ➔ <span style={{ color: '#059669' }}>Before/After 경과 비교</span>
              </h3>
              <div className="grid-3" style={{ marginTop: '24px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>1️⃣</div>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#0f172a' }}>AI 진단 리포트</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>의심 질환 Top 3 확인 및 가정 내 소독/넥카라 처치 가이드 숙지</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>2️⃣</div>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#0f172a' }}>3일 뒤 경과 촬영</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>동일 환부 사진을 다시 촬영하여 Before/After 슬라이더로 대조</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>3️⃣</div>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#0f172a' }}>Gemini 경과 소견</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>AI가 호전/유지/악화 판단 (악화 시 즉시 병원 연동으로 자동 전환)</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span className="badge badge-rose" style={{ fontSize: '14px' }}>위험도: EMERGENCY</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>안구 천공, 심각한 출혈, 골절, 궤양</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#e11d48' }}>
                타임라인 생략 ➔ <span style={{ color: '#0f172a' }}>🚨 주변 24시 응급 동물병원 즉시 연결</span>
              </h3>
              <div className="grid-3" style={{ marginTop: '24px' }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚨</div>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#be123c' }}>응급 경고 팝업</div>
                  <div style={{ fontSize: '12px', color: '#881337' }}>가정 내 관찰을 건너뛰고 핫버튼으로 지체 없이 직행</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#be123c' }}>위치 기반 24시 감지</div>
                  <div style={{ fontSize: '12px', color: '#881337' }}>현재 위치 중심 1km/3km 내 24시 운영 병원 자동 필터링</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#be123c' }}>전화 및 길안내</div>
                  <div style={{ fontSize: '12px', color: '#881337' }}>원터치 전화 걸기 및 카카오/네이버 길안내 앱 외부 연결</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

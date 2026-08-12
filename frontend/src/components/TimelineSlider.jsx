import React, { useState } from 'react';

export default function TimelineSlider() {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <section id="timeline-section" style={{ padding: '60px 0', background: '#ffffff' }}>
      <div className="container">
        <div className="section-header">
          <span className="badge badge-emerald" style={{ marginBottom: '12px' }}>TIMELINE & BEFORE/AFTER</span>
          <h2>증상 변화 추이 '타임라인 & 이미지 비교'</h2>
          <p>동일 환부의 과거 진단 기록과 현재 사진을 슬라이더로 시각적 비교하고 AI 소견을 확인하세요.</p>
        </div>

        <div className="glass-card grid-2" style={{ padding: '32px', alignItems: 'center' }}>
          {/* Left: Interactive Image Comparison Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', fontWeight: '700' }}>
              <span style={{ color: '#be123c' }}>◀ Before (8월 1일 진단)</span>
              <span style={{ color: '#047857' }}>After (8월 6일 진단) ▶</span>
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              userSelect: 'none',
              boxShadow: 'var(--shadow-md)'
            }}>
              {/* After Image (Background) */}
              <img
                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80"
                alt="After"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />

              {/* Before Image (Clipped Top Layer) */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${sliderPos}%`,
                overflow: 'hidden'
              }}>
                <img
                  src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80"
                  alt="Before"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'sepia(0.3) contrast(1.2)'
                  }}
                />
              </div>

              {/* Divider Line & Handle */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${sliderPos}%`,
                width: '4px',
                background: '#ffffff',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                cursor: 'ew-resize'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                  ↔
                </div>
              </div>

              {/* Invisible Range Input for Drag Interaction */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'ew-resize',
                  margin: 0
                }}
              />
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '8px', fontWeight: '500' }}>
              👆 마우스나 손가락으로 중앙 핸들을 좌우로 드래그하여 환부 경과를 비교해보세요.
            </div>
          </div>

          {/* Right: Gemini Progress Analysis Report */}
          <div style={{ paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="badge badge-emerald" style={{ fontSize: '13px' }}>경과 상태: 호전 (IMPROVED)</span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>초코 (푸들 · 귀 뒤쪽 피부)</span>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>
              Gemini AI 경과 변화 추이 소견
            </h3>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#334155'
            }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#059669' }}>[경과 비교 결과 요약]</strong><br />
                8월 1일 최초 진단 대비, 환부의 붉은 발적 및 각질 형태가 약 <strong style={{ color: '#059669' }}>55% 감소</strong>하였으며 2차 진물 발생이 관찰되지 않아 뚜렷한 호전 양상을 보입니다.
              </p>
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                <strong>향후 케어 제안:</strong><br />
                현재 사용 중이신 약용 소독 처방을 4일 간 추가 유지해 주시고, 긁음 반응 방지를 위해 넥카라 착용을 지속해 주시기 바랍니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '13px 20px', fontSize: '13.5px' }}>
                📸 신규 경과 사진 등록하기
              </button>
              <button className="btn btn-secondary" style={{ padding: '13px 20px', fontSize: '13.5px' }}>
                📤 리포트 공유
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

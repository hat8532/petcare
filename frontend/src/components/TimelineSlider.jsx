import React, { useState, useEffect, useRef } from 'react';

const PRESET_CASES = [
  {
    id: 'skin-pyoderma',
    title: '🐾 피부: 농피증 & 발적 호전 추이',
    petName: '초코 (푸들)',
    bodyPart: '귀 뒤쪽 피부',
    status: '호전 (IMPROVED)',
    statusColor: '#059669',
    improvementRate: 55,
    beforeDate: '2026-08-01',
    afterDate: '2026-08-06',
    beforeImg: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80',
    afterImg: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
    aiSummary: '8월 1일 최초 진단 대비, 환부의 붉은 발적 및 각질 형태가 약 55% 감소하였으며 2차 진물 발생이 관찰되지 않아 뚜렷한 호전 양상을 보입니다.',
    aiAdvice: '현재 사용 중이신 약용 소독 처방을 4일 간 추가 유지해 주시고, 긁음 반응 방지를 위해 넥카라 착용을 지속해 주시기 바랍니다.'
  },
  {
    id: 'ear-otitis',
    title: '👂 이비인후과: 외이염 분비물 완화',
    petName: '보리 (말티즈)',
    bodyPart: '우측 귓바퀴 안쪽',
    status: '호전 (IMPROVED)',
    statusColor: '#059669',
    improvementRate: 80,
    beforeDate: '2026-07-15',
    afterDate: '2026-07-28',
    beforeImg: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80',
    afterImg: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80',
    aiSummary: '갈색 삼출물 및 귀 털 엉킴이 80% 이상 해소되었으며, 외이도 부종이 가라앉아 정상적인 핑크빛 피부 톤을 회복했습니다.',
    aiAdvice: '목욕 후 귀 내부 건조를 철저히 해주시고 주 1회 순한 귀 세정제로 유지 관리를 권장합니다.'
  },
  {
    id: 'eye-stain',
    title: '👁️ 안과: 결막 충혈 & 눈물 자국 개선',
    petName: '나비 (코숏)',
    bodyPart: '좌측 안구 주변',
    status: '안정 (STABLE)',
    statusColor: '#2563eb',
    improvementRate: 65,
    beforeDate: '2026-08-10',
    afterDate: '2026-08-22',
    beforeImg: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    afterImg: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80',
    aiSummary: '결막 충혈도가 크게 완화되었고 과도한 눈물 배출량이 65% 가량 줄어들어 눈 주위 털 착색 진행이 중단되었습니다.',
    aiAdvice: '처방받은 인공눈물 안약을 하루 2회 점안해 주시고, 먼지가 많은 환경을 피해 주세요.'
  }
];

export default function TimelineSlider({ selectedPet }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [activeCase, setActiveCase] = useState(PRESET_CASES[0]);

  // Custom upload state
  const [beforeImage, setBeforeImage] = useState(PRESET_CASES[0].beforeImg);
  const [afterImage, setAfterImage] = useState(PRESET_CASES[0].afterImg);
  const [beforeDate, setBeforeDate] = useState(PRESET_CASES[0].beforeDate);
  const [afterDate, setAfterDate] = useState(PRESET_CASES[0].afterDate);
  const [bodyPart, setBodyPart] = useState(PRESET_CASES[0].bodyPart);
  const [status, setStatus] = useState(PRESET_CASES[0].status);
  const [improvementRate, setImprovementRate] = useState(PRESET_CASES[0].improvementRate);
  const [customMemo, setCustomMemo] = useState(PRESET_CASES[0].aiSummary);
  const [isCustomUpload, setIsCustomUpload] = useState(false);

  // Timeline History Records
  const [historyList, setHistoryList] = useState(() => {
    const saved = localStorage.getItem('petcare_timeline_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'hist-1',
        title: '농피증 1차 경과 비교',
        petName: selectedPet?.name || '초코',
        date: '2026-08-06',
        improvement: 55,
        status: '호전 (IMPROVED)',
        summary: '발적 55% 감소, 진물 미발생'
      }
    ];
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const beforeFileRef = useRef(null);
  const afterFileRef = useRef(null);

  // Handle Preset Case Change
  const handleSelectCase = (c) => {
    setActiveCase(c);
    setIsCustomUpload(false);
    setBeforeImage(c.beforeImg);
    setAfterImage(c.afterImg);
    setBeforeDate(c.beforeDate);
    setAfterDate(c.afterDate);
    setBodyPart(c.bodyPart);
    setStatus(c.status);
    setImprovementRate(c.improvementRate);
    setCustomMemo(c.aiSummary);
  };

  // Image Upload Handlers
  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'before') {
        setBeforeImage(event.target.result);
      } else {
        setAfterImage(event.target.result);
      }
      setIsCustomUpload(true);
    };
    reader.readAsDataURL(file);
  };

  // Save current comparison to history
  const handleSaveToHistory = () => {
    const newRecord = {
      id: `hist-${Date.now()}`,
      title: `${bodyPart || '환부'} 경과 기록`,
      petName: selectedPet?.name || activeCase.petName,
      date: afterDate,
      improvement: improvementRate,
      status: status,
      summary: customMemo.slice(0, 45) + '...'
    };

    const updated = [newRecord, ...historyList];
    setHistoryList(updated);
    localStorage.setItem('petcare_timeline_records', JSON.stringify(updated));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDeleteHistory = (id) => {
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('petcare_timeline_records', JSON.stringify(updated));
  };

  return (
    <section id="timeline-section" style={{ padding: '30px 0 80px 0', background: '#f8fafc' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 14px', borderRadius: '9999px' }}>
            TIMELINE & BEFORE / AFTER
          </span>
          <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
            증상 변화 추이 '타임라인 & 이미지 비교'
          </h2>
          <p style={{ fontSize: '14.5px', color: '#475569', marginTop: '6px' }}>
            동일 환부의 과거 진단 기록과 현재 사진을 슬라이더로 시각적 비교하고 치료 경과를 기록하세요.
          </p>
        </div>

        {/* Preset Selector & Custom Upload Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PRESET_CASES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCase(c)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: activeCase.id === c.id && !isCustomUpload ? '800' : '600',
                  background: activeCase.id === c.id && !isCustomUpload ? '#059669' : '#ffffff',
                  color: activeCase.id === c.id && !isCustomUpload ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {c.title}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="file"
              ref={beforeFileRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e, 'before')}
            />
            <input
              type="file"
              ref={afterFileRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e, 'after')}
            />
            <button
              type="button"
              onClick={() => beforeFileRef.current?.click()}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#be123c',
                cursor: 'pointer'
              }}
            >
              📷 과거(Before) 사진 등록
            </button>
            <button
              type="button"
              onClick={() => afterFileRef.current?.click()}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#059669',
                cursor: 'pointer'
              }}
            >
              📸 현재(After) 사진 등록
            </button>
          </div>
        </div>

        {/* Main Comparison Glass Card */}
        <div className="glass-card" style={{ padding: '32px', marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '36px', alignItems: 'center' }}>
          
          {/* Left: Interactive Image Comparison Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', fontWeight: '800' }}>
              <span style={{ color: '#be123c', background: '#ffe4e6', padding: '3px 10px', borderRadius: '6px' }}>
                ◀ Before ({beforeDate})
              </span>
              <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: '6px' }}>
                After ({afterDate}) ▶
              </span>
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              height: '340px',
              borderRadius: '20px',
              overflow: 'hidden',
              userSelect: 'none',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
              border: '2px solid #e2e8f0'
            }}>
              {/* After Image (Background) */}
              <img
                src={afterImage}
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
                  src={beforeImage}
                  alt="Before"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: isCustomUpload ? 'none' : 'sepia(0.2) contrast(1.15)'
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
                boxShadow: '0 0 12px rgba(0,0,0,0.35)',
                cursor: 'ew-resize'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  border: '2px solid #059669'
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

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '10px', fontWeight: '600' }}>
              👆 마우스나 손가락으로 중앙 핸들을 좌우로 드래그하여 환부 경과를 비교해보세요.
            </div>
          </div>

          {/* Right: AI Analysis & Progress Memo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                상태: {status}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                {selectedPet?.name || activeCase.petName} · {bodyPart}
              </span>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '14px', color: '#0f172a' }}>
              경과 변화 추이 소견 및 메모
            </h3>

            {/* Improvement Progress Slider & Badge */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  📊 환부 호전율: <strong style={{ color: '#059669' }}>{improvementRate}%</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={improvementRate}
                  onChange={(e) => setImprovementRate(e.target.value)}
                  style={{ width: '130px', accentColor: '#059669' }}
                />
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${improvementRate}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>

            {/* AI Summary Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '18px',
              borderRadius: '16px',
              marginBottom: '20px',
              fontSize: '13.5px',
              lineHeight: '1.65',
              color: '#334155'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#059669', display: 'block', marginBottom: '4px' }}>[경과 비교 결과 요약]</strong>
                <textarea
                  rows={3}
                  value={customMemo}
                  onChange={(e) => setCustomMemo(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>
              <div style={{ color: '#64748b', fontSize: '12.5px' }}>
                <strong style={{ color: '#475569' }}>💡 향후 케어 제안:</strong><br />
                {activeCase.aiAdvice}
              </div>
            </div>

            {savedSuccess && (
              <div style={{ padding: '10px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '12.5px', fontWeight: '700', marginBottom: '14px', textAlign: 'center' }}>
                ✓ 타임라인 경과 기록이 성공적으로 저장되었습니다!
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSaveToHistory}
                className="btn btn-primary"
                style={{ flex: 1, padding: '13px 20px', fontSize: '14px' }}
              >
                💾 타임라인 기록 저장하기
              </button>
            </div>
          </div>
        </div>

        {/* Timeline History Records List */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📜</span> 누적 타임라인 경과 기록 ({historyList.length}건)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {historyList.map(record => (
              <div
                key={record.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      {record.title}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '700', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px' }}>
                      호전율 {record.improvement}%
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    📅 {record.date} · 🐾 {record.petName}
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                    {record.summary}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(record.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    삭제 🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}


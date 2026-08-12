import React, { useState, useEffect } from 'react';
import DailyCareChatbot from './DailyCareChatbot';
import TimelineSlider from './TimelineSlider';

export default function PetHealthDashboard({ selectedPet, setSelectedPet, pets, onNavigateDiagnosis, onOpenEditPet }) {
  const [activeSubTab, setActiveSubTab] = useState('phr');
  
  // Stored health profile state per pet
  const [vitals, setVitals] = useState({
    bodyTemp: '38.5',
    heartRate: '110',
    weight: selectedPet?.weight?.replace('kg', '') || '3.5',
    allergies: '닭고기 알레르기',
    conditions: '과거 귀 습진 재발 이력',
    medications: '소독약 처방 유지 중'
  });

  const [dailyChecklist, setDailyChecklist] = useState({
    water: true,
    walk: true,
    snack: false,
    medication: true
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (selectedPet) {
      setVitals(prev => ({
        ...prev,
        weight: selectedPet.weight ? selectedPet.weight.replace('kg', '') : '3.5'
      }));
    }
  }, [selectedPet]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsSaved(true);
    if (selectedPet && setSelectedPet) {
      const updated = {
        ...selectedPet,
        healthProfile: vitals
      };
      setSelectedPet(updated);
    }
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleChecklist = (key) => {
    setDailyChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section id="dashboard-section" style={{ padding: '50px 0 80px 0', background: '#f8fafc' }}>
      <div className="container">
        
        {/* Sub-Tab Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '9999px', display: 'inline-flex', gap: '6px', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
            {[
              { id: 'phr', label: '📊 바이탈 & PHR 프로필' },
              { id: 'daily-ai', label: '🤖 일상 펫 케어 AI 챗봇' },
              { id: 'timeline', label: '📅 Before / After 경과 관찰' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  fontSize: '13.5px',
                  fontWeight: activeSubTab === tab.id ? '800' : '600',
                  background: activeSubTab === tab.id ? '#059669' : 'transparent',
                  color: activeSubTab === tab.id ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSubTab === tab.id ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeSubTab === 'daily-ai' && <DailyCareChatbot selectedPet={selectedPet} />}
        {activeSubTab === 'timeline' && <TimelineSlider selectedPet={selectedPet} />}

        {activeSubTab === 'phr' && (
          <>
            {/* Section Header */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 14px', borderRadius: '9999px' }}>
                PERSONAL HEALTH RECORD (PHR)
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
                스마트 반려동물 헬스 대시보드
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                아이의 체온, 기저 질환, 알레르기 정보를 누적하면 AI 진단 시 초개인화 수의학 소견이 자동 생성됩니다.
              </p>
            </div>

        {/* Top Active Pet Banner */}
        <div className="glass-card" style={{ padding: '24px 32px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)', border: '1px solid #a7f3d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#ffffff', border: '2px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.15)' }}>
              {selectedPet?.icon || '🐾'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {selectedPet ? selectedPet.name : '등록된 반려동물 선택'}
                </h3>
                <span style={{ fontSize: '11px', fontWeight: '800', background: '#059669', color: '#ffffff', padding: '3px 10px', borderRadius: '9999px' }}>
                  {selectedPet ? selectedPet.species || 'PET' : '미등록'}
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#475569', marginTop: '4px', margin: 0 }}>
                {selectedPet ? `${selectedPet.breed || '믹스'} · ${selectedPet.age || '1살'} · ${selectedPet.weight || '3.5kg'}` : '상단 내비게이션에서 아이를 등록하세요'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onOpenEditPet && selectedPet && (
              <button
                type="button"
                onClick={() => onOpenEditPet(selectedPet)}
                className="btn-neutral-secondary"
                style={{ padding: '11px 18px', fontSize: '13.5px', background: '#ffffff' }}
              >
                ✏️ 프로필 수정
              </button>
            )}
            <button
              onClick={onNavigateDiagnosis}
              className="photo-btn-gradient"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              <span>🩺</span> 이 프로필로 AI 진단 받기
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          
          {/* Left Column: Vitals & Medical Profile Form */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌡️</span> 기초 바이탈 & 건강 프로필
              </h3>
              <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                AI 진단 연동됨
              </span>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isSaved && (
                <div style={{ padding: '10px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '12.5px', fontWeight: '700', textAlign: 'center' }}>
                  ✓ 대시보드 건강 프로필이 저장되었습니다. AI 진단에 자동 반영됩니다!
                </div>
              )}

              {/* Vitals Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    체온 (°C)
                  </label>
                  <input
                    type="text"
                    value={vitals.bodyTemp}
                    onChange={(e) => setVitals({ ...vitals, bodyTemp: e.target.value })}
                    placeholder="38.5"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  <span style={{ fontSize: '10px', color: '#059669', fontWeight: '600' }}>정상: 37.5~39°C</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    심박수 (bpm)
                  </label>
                  <input
                    type="text"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                    placeholder="110"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  <span style={{ fontSize: '10px', color: '#059669', fontWeight: '600' }}>정상: 60~140</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    몸무게 (kg)
                  </label>
                  <input
                    type="text"
                    value={vitals.weight}
                    onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                    placeholder="3.5"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>체중 관리</span>
                </div>
              </div>

              {/* Allergies & Conditions */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  알레르기 이력 (음식 / 환경)
                </label>
                <input
                  type="text"
                  value={vitals.allergies}
                  onChange={(e) => setVitals({ ...vitals, allergies: e.target.value })}
                  placeholder="예: 닭고기 알레르기, 꽃가루"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  기저 질환 & 주요 과거병력
                </label>
                <textarea
                  rows={2}
                  value={vitals.conditions}
                  onChange={(e) => setVitals({ ...vitals, conditions: e.target.value })}
                  placeholder="예: 과거 슬개골 탈구 1기, 귀 습진 재발 이력"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '14px' }}
              >
                💾 대시보드 건강 프로필 저장
              </button>
            </form>
          </div>

          {/* Right Column: 1-Tap Daily Checklist & Health Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1-Tap Daily Checklist */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👆</span> 오늘 1초 케어 체크리스트
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { key: 'water', label: '💧 물 충분히 섭취', desc: '체내 수분 보충' },
                  { key: 'walk', label: '🦮 산책 30분 완료', desc: '관절 & 스트레스 케어' },
                  { key: 'snack', label: '🦴 간식 조절하기', desc: '칼로리 과다 방지' },
                  { key: 'medication', label: '💊 소독/약 투여', desc: '처방 케어 지키기' }
                ].map((item) => {
                  const active = dailyChecklist[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleChecklist(item.key)}
                      style={{
                        padding: '14px',
                        borderRadius: '16px',
                        border: active ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: active ? '#ecfdf5' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: active ? '#047857' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{item.label}</span>
                        <span style={{ fontSize: '16px' }}>{active ? '✅' : '⬜'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent AI Diagnosis Record Summary */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  📋 최근 AI 질병 진단 기록
                </h3>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700', cursor: 'pointer' }} onClick={onNavigateDiagnosis}>
                  진단 스튜디오 이동 ➔
                </span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    1위 의심: 농피증 / 세균성 피부염 (84.5%)
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                    CAUTION (주의)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  💡 <strong>대시보드 바이탈 연동:</strong> 체온 38.5°C 정상 범위 내 발적 관찰됨. 3일 간 약용 소독 및 넥카라 유지 추천.
                </p>
              </div>
            </div>

          </div>

        </div>
        </>
        )}

      </div>
    </section>
  );
}

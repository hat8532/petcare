import React, { useState, useEffect } from 'react';
import DailyCareChatbot from './DailyCareChatbot';
import TimelineSlider from './TimelineSlider';

export default function PetHealthDashboard({ 
  user,
  selectedPet, 
  setSelectedPet, 
  pets = [], 
  onOpenLogin,
  onNavigateDiagnosis, 
  onOpenEditPet 
}) {
  const [activeSubTab, setActiveSubTab] = useState('phr');
  
  const petIdKey = selectedPet?.id ? `pet_${selectedPet.id}` : 'pet_default';

  // 1. PHR Vitals Profile State (No hardcoded values)
  const [vitals, setVitals] = useState({
    bodyTemp: '',
    heartRate: '',
    weight: '',
    allergies: '',
    conditions: '',
    medications: ''
  });

  // 2. Daily Checklist Items & State (No pre-checked hardcoding)
  const [checklistItems, setChecklistItems] = useState([
    { key: 'water', label: '수분 섭취', desc: '체내 수분 보충' },
    { key: 'walk', label: '산책 30분', desc: '관절 & 스트레스 케어' },
    { key: 'snack', label: '간식 조절', desc: '칼로리 과다 방지' },
    { key: 'medication', label: '소독/약 투여', desc: '처방 케어 지키기' }
  ]);
  const [dailyChecklist, setDailyChecklist] = useState({});
  const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState({ label: '', desc: '' });

  // Weekly Stamp Days
  const weeklyDays = ['월', '화', '수', '목', '금', '토', '오늘'];

  // 3. Vitals & Weight History (Dynamic, empty by default)
  const [vitalHistory, setVitalHistory] = useState([]);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newLog, setNewLog] = useState({ weight: '', temp: '', date: '' });

  // 4. Care Reminders (D-Day & Calendar Scheduler - Dynamic, empty by default)
  const [reminders, setReminders] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    targetDate: '',
    tag: '예방약',
    icon: '💊'
  });

  // 5. Recent Diagnosis State (From localStorage or real records)
  const [recentDiagnosis, setRecentDiagnosis] = useState(null);

  const [isSaved, setIsSaved] = useState(false);

  // Check login state: prop or localStorage fallback
  const isUserLoggedIn = !!user || !!localStorage.getItem('petcare_user');

  useEffect(() => {
    if (!selectedPet) {
      setVitals({ bodyTemp: '', heartRate: '', weight: '', allergies: '', conditions: '', medications: '' });
      setVitalHistory([]);
      setReminders([]);
      setDailyChecklist({});
      setRecentDiagnosis(null);
      return;
    }

    // 1. Load Vitals
    const savedVitals = localStorage.getItem(`petcare_vitals_${petIdKey}`);
    if (savedVitals) {
      try { 
        setVitals(JSON.parse(savedVitals)); 
      } catch (e) {}
    } else {
      setVitals({
        bodyTemp: selectedPet.bodyTemp || selectedPet.healthProfile?.bodyTemp || '',
        heartRate: selectedPet.heartRate || selectedPet.healthProfile?.heartRate || '',
        weight: selectedPet.weight ? String(selectedPet.weight).replace('kg', '') : '',
        allergies: selectedPet.allergies || selectedPet.healthProfile?.allergies || '',
        conditions: selectedPet.conditions || selectedPet.healthProfile?.conditions || '',
        medications: selectedPet.medications || selectedPet.healthProfile?.medications || ''
      });
    }

    // 2. Load Checklist
    const savedCheckItems = localStorage.getItem(`petcare_checkitems_${petIdKey}`);
    if (savedCheckItems) {
      try { setChecklistItems(JSON.parse(savedCheckItems)); } catch (e) {}
    }
    const savedCheck = localStorage.getItem(`petcare_checklist_${petIdKey}`);
    if (savedCheck) {
      try { setDailyChecklist(JSON.parse(savedCheck)); } catch (e) { setDailyChecklist({}); }
    } else {
      setDailyChecklist({});
    }

    // 3. Load Reminders
    const savedReminders = localStorage.getItem(`petcare_reminders_${petIdKey}`);
    if (savedReminders) {
      try { setReminders(JSON.parse(savedReminders)); } catch (e) { setReminders([]); }
    } else {
      setReminders([]);
    }

    // 4. Load Vital History
    const savedHistory = localStorage.getItem(`petcare_history_${petIdKey}`);
    if (savedHistory) {
      try { setVitalHistory(JSON.parse(savedHistory)); } catch (e) { setVitalHistory([]); }
    } else {
      setVitalHistory([]);
    }

    // 5. Load Recent Diagnosis (From diagnosis records storage)
    const allRecords = localStorage.getItem('petcare_diagnosis_records');
    if (allRecords) {
      try {
        const parsed = JSON.parse(allRecords);
        const petRecords = parsed.filter(r => String(r.petId) === String(selectedPet.id) || !r.petId);
        if (petRecords.length > 0) {
          setRecentDiagnosis(petRecords[petRecords.length - 1]);
        } else {
          setRecentDiagnosis(null);
        }
      } catch (e) {
        setRecentDiagnosis(null);
      }
    } else {
      setRecentDiagnosis(null);
    }
  }, [selectedPet, petIdKey]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsSaved(true);
    localStorage.setItem(`petcare_vitals_${petIdKey}`, JSON.stringify(vitals));

    if (selectedPet && setSelectedPet) {
      const updated = {
        ...selectedPet,
        weight: vitals.weight ? `${vitals.weight}kg` : selectedPet.weight,
        healthProfile: vitals
      };
      setSelectedPet(updated);
    }
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleChecklist = (key) => {
    setDailyChecklist(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`petcare_checklist_${petIdKey}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddCustomCheckItem = (e) => {
    e.preventDefault();
    if (!newCheckItem.label.trim()) return;
    const key = `custom_${Date.now()}`;
    const newItem = {
      key,
      label: newCheckItem.label,
      desc: newCheckItem.desc || '맞춤 케어'
    };
    const updatedList = [...checklistItems, newItem];
    setChecklistItems(updatedList);
    localStorage.setItem(`petcare_checkitems_${petIdKey}`, JSON.stringify(updatedList));
    setNewCheckItem({ label: '', desc: '' });
    setShowAddChecklistModal(false);
  };

  const handleDeleteCheckItem = (e, key) => {
    e.stopPropagation();
    const updated = checklistItems.filter(item => item.key !== key);
    setChecklistItems(updated);
    localStorage.setItem(`petcare_checkitems_${petIdKey}`, JSON.stringify(updated));
  };

  const completedCount = checklistItems.filter(item => dailyChecklist[item.key]).length;
  const completionRate = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  const handleAddVitalRecord = (e) => {
    e.preventDefault();
    if (!newLog.weight && !newLog.temp) return;
    const w = parseFloat(newLog.weight) || (vitals.weight ? parseFloat(vitals.weight) : 0);
    const t = parseFloat(newLog.temp) || (vitals.bodyTemp ? parseFloat(vitals.bodyTemp) : 0);
    
    let dateStr = newLog.date;
    if (!dateStr) {
      const today = new Date();
      dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    } else {
      dateStr = dateStr.slice(5).replace('-', '/');
    }
    
    const updatedHistory = [...vitalHistory.slice(-6), { date: dateStr, weight: w, temp: t }];
    setVitalHistory(updatedHistory);
    localStorage.setItem(`petcare_history_${petIdKey}`, JSON.stringify(updatedHistory));
    
    if (w > 0) setVitals(prev => ({ ...prev, weight: String(w) }));
    if (t > 0) setVitals(prev => ({ ...prev, bodyTemp: String(t) }));
    
    setNewLog({ weight: '', temp: '', date: '' });
    setShowAddLogModal(false);
  };

  const getDDay = (targetDateStr) => {
    if (!targetDateStr) return 'D-Day';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '오늘';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };

  const toggleReminderComplete = (id) => {
    setReminders(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
      localStorage.setItem(`petcare_reminders_${petIdKey}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!newReminder.title.trim() || !newReminder.targetDate) return;

    let icon = '💊';
    if (newReminder.tag === '백신') icon = '💉';
    else if (newReminder.tag === '검진') icon = '🩺';
    else if (newReminder.tag === '미용') icon = '✂️';
    else if (newReminder.tag === '기념일') icon = '🎂';

    const newEntry = {
      id: `rem_${Date.now()}`,
      title: newReminder.title,
      targetDate: newReminder.targetDate,
      tag: newReminder.tag || '예방약',
      icon: icon,
      completed: false
    };
    const updated = [...reminders, newEntry].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
    setReminders(updated);
    localStorage.setItem(`petcare_reminders_${petIdKey}`, JSON.stringify(updated));
    setNewReminder({ title: '', targetDate: '', tag: '예방약', icon: '💊' });
    setShowScheduleModal(false);
  };

  const handleDeleteReminder = (id) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem(`petcare_reminders_${petIdKey}`, JSON.stringify(updated));
  };

  // ============================================================
  // 🌟 [OPTION 2] 비로그인 사용자 전용 세련된 프리뷰 & 1초 로그인 뷰
  // ============================================================
  if (!isUserLoggedIn) {
    return (
      <section id="dashboard-unauth-section" style={{ padding: '40px 0 80px 0', background: '#fafbfc', minHeight: '85vh' }}>
        <div className="container" style={{ maxWidth: '960px', textAlign: 'center' }}>
          
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
            borderRadius: '24px',
            padding: '50px 30px',
            border: '1px solid #d1fae5',
            boxShadow: '0 10px 35px rgba(5, 150, 105, 0.08)'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 16px', borderRadius: '9999px', display: 'inline-block', marginBottom: '16px' }}>
              🐾 PETCARE AI SMART PHR
            </span>

            <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
              로그인하고 우리 아이 맞춤 헬스케어를 시작하세요
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '620px', margin: '0 auto 36px auto', lineHeight: '1.6' }}>
              반려동물을 등록하면 기초 바이탈, 1초 데일리 케어 루틴, 체중 변화 그래프 및 예방 접종 D-Day까지 스마트하게 한곳에서 관리할 수 있습니다.
            </p>

            {/* 3 Core Benefit Cards Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '40px', textAlign: 'left' }}>
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  📊
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>바이탈 & 체중 추이</h4>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                  체온, 심박, 체중 변화를 인터랙티브 SVG 차트로 한눈에 모니터링합니다.
                </p>
              </div>

              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  🎯
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>1초 케어 체크리스트</h4>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                  수분, 산책, 복약 등 매일의 필수 케어를 1초 만에 기록하고 실천율을 추적합니다.
                </p>
              </div>

              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  ⏰
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>예방 접종 & D-Day</h4>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                  심장사상충, 종합백신, 정기 검진 일정을 등록하고 D-Day 알림을 받습니다.
                </p>
              </div>
            </div>

            {/* CTA Login Button */}
            <button
              type="button"
              onClick={onOpenLogin}
              style={{
                padding: '14px 36px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(5, 150, 105, 0.3)',
                transition: 'transform 0.15s ease'
              }}
            >
              로그인하고 시작하기
            </button>
          </div>

        </div>
      </section>
    );
  }

  return (
    <section id="dashboard-section" style={{ padding: '24px 0 60px 0', background: '#fafbfc', minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: '1220px' }}>
        
        {/* ============================================================ */}
        {/* 🌟 1. SPACIOUS & OPEN HEADER */}
        {/* ============================================================ */}
        <div style={{ marginBottom: '24px' }}>
          
          {/* Top Row: Title + Pet Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                반려동물 헬스 대시보드
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                우리 아이의 실시간 바이탈, 데일리 케어 및 진료 일정을 관리하세요.
              </p>
            </div>

            {/* Pet Switcher Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {pets && pets.length > 0 ? (
                pets.map(pet => {
                  const isCurrent = selectedPet?.id === pet.id;
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPet(pet)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: isCurrent ? '700' : '500',
                        border: isCurrent ? '1.5px solid #059669' : '1px solid #e2e8f0',
                        background: isCurrent ? '#f0fdf4' : '#ffffff',
                        color: isCurrent ? '#047857' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isCurrent ? '0 2px 6px rgba(5, 150, 105, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{pet.icon || '🐶'}</span>
                      <span>{pet.name}</span>
                      <span style={{ fontSize: '11.5px', color: isCurrent ? '#059669' : '#94a3b8' }}>
                        ({pet.species || '반려동물'})
                      </span>
                    </button>
                  );
                })
              ) : (
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>등록된 반려동물이 없습니다</span>
              )}
            </div>
          </div>

          {/* Bottom Row: Clean Underline Tab Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '2px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {[
                { id: 'phr', label: '바이탈 & 건강 프로필' },
                { id: 'daily-ai', label: '일상 맞춤 AI 챗봇' },
                { id: 'timeline', label: '증상 경과 관찰' }
              ].map(tab => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    style={{
                      padding: '8px 4px 12px 4px',
                      fontSize: '14px',
                      fontWeight: isActive ? '700' : '500',
                      color: isActive ? '#059669' : '#64748b',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2.5px solid #059669' : '2.5px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginBottom: '-1px'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onNavigateDiagnosis}
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '6px',
                transition: 'background 0.15s ease'
              }}
            >
              + AI 질병 진단하기
            </button>
          </div>

        </div>

        {activeSubTab === 'daily-ai' && <DailyCareChatbot selectedPet={selectedPet} />}
        {activeSubTab === 'timeline' && <TimelineSlider selectedPet={selectedPet} />}

        {activeSubTab === 'phr' && (
          <>
            {/* ============================================================ */}
            {/* 🌟 2. 2-COLUMN PREMIUM BENTO GRID */}
            {/* ============================================================ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '20px'
            }}>
              
              {/* ------------------------------------------------------------ */}
              {/* CARD 1: 🐾 기초 바이탈 & 프로필 (좌상단) */}
              {/* ------------------------------------------------------------ */}
              <div className="glass-card" style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', border: '1.5px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        {selectedPet?.icon || '🐾'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            {selectedPet ? selectedPet.name : '반려동물 미선택'}
                          </h3>
                          <span style={{ fontSize: '10.5px', fontWeight: '700', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                            {selectedPet?.species || 'PET'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {selectedPet ? `${selectedPet.breed || '품종 정보 없음'} · ${selectedPet.age || '나이 미입력'}` : '상단에서 아이를 선택하세요'}
                        </span>
                      </div>
                    </div>

                    {onOpenEditPet && selectedPet && (
                      <button
                        type="button"
                        onClick={() => onOpenEditPet(selectedPet)}
                        style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                      >
                        ✏️ 수정
                      </button>
                    )}
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isSaved && (
                      <div style={{ padding: '7px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '11.5px', fontWeight: '700', textAlign: 'center' }}>
                        ✓ 건강 프로필이 저장되었습니다.
                      </div>
                    )}

                    {/* Vitals 3-Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div style={{ background: '#f8fafc', padding: '9px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>체온 (°C)</div>
                        <input
                          type="text"
                          value={vitals.bodyTemp}
                          onChange={(e) => setVitals({ ...vitals, bodyTemp: e.target.value })}
                          placeholder="38.5"
                          style={{ width: '100%', padding: '2px 0', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '800', color: '#0f172a', outline: 'none' }}
                        />
                        <div style={{ fontSize: '9.5px', color: '#059669', fontWeight: '600' }}>정상 37.5~39°C</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '9px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>심박수 (bpm)</div>
                        <input
                          type="text"
                          value={vitals.heartRate}
                          onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                          placeholder="110"
                          style={{ width: '100%', padding: '2px 0', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '800', color: '#0f172a', outline: 'none' }}
                        />
                        <div style={{ fontSize: '9.5px', color: '#059669', fontWeight: '600' }}>정상 60~140</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '9px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>몸무게 (kg)</div>
                        <input
                          type="text"
                          value={vitals.weight}
                          onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                          placeholder="예: 3.5"
                          style={{ width: '100%', padding: '2px 0', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '800', color: '#0f172a', outline: 'none' }}
                        />
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>체중 관리</div>
                      </div>
                    </div>

                    {/* Allergies & Conditions */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                        알레르기 이력
                      </label>
                      <input
                        type="text"
                        value={vitals.allergies}
                        onChange={(e) => setVitals({ ...vitals, allergies: e.target.value })}
                        placeholder="예: 닭고기 알레르기, 특정 약물 반응 등"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                        기저 질환 & 과거 병력
                      </label>
                      <input
                        type="text"
                        value={vitals.conditions}
                        onChange={(e) => setVitals({ ...vitals, conditions: e.target.value })}
                        placeholder="예: 슬개골 탈구, 피부염 재발 이력 등"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '9px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        marginTop: '2px',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)'
                      }}
                    >
                      💾 바이탈 프로필 저장
                    </button>
                  </form>
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* CARD 2: 🎯 오늘의 데일리 케어 & 실천 트래커 (우상단) */}
              {/* ------------------------------------------------------------ */}
              <div className="glass-card" style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎯</span> 오늘 1초 케어
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddChecklistModal(true)}
                        style={{ padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: '700', color: '#059669', cursor: 'pointer' }}
                      >
                        + 항목 추가
                      </button>
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', color: completionRate === 100 ? '#047857' : '#64748b', background: completionRate === 100 ? '#ecfdf5' : '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '9999px' }}>
                      {completionRate === 100 ? '🎉 오늘 케어 완료' : '오늘 실천 기록'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569', fontWeight: '700', marginBottom: '6px' }}>
                      <span>오늘의 달성도 ({completedCount}/{checklistItems.length} 완료)</span>
                      <span style={{ fontWeight: '800', color: '#059669' }}>{completionRate}%</span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${completionRate}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>

                  {/* Checklist Items Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                    {checklistItems.map((item) => {
                      const active = !!dailyChecklist[item.key];
                      const isCustom = item.key.startsWith('custom_');
                      return (
                        <div
                          key={item.key}
                          onClick={() => toggleChecklist(item.key)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: active ? '1.5px solid #059669' : '1px solid #e2e8f0',
                            background: active ? '#ecfdf5' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: '700', color: active ? '#047857' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{item.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '13px' }}>{active ? '✅' : '⬜'}</span>
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCheckItem(e, item.key)}
                                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Weekly Stamp Tracker */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '8px 12px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', fontWeight: '700', marginBottom: '6px' }}>
                      <span>📅 최근 7일 실천 현황</span>
                      <span style={{ color: '#059669', fontWeight: '800' }}>
                        오늘 {completedCount > 0 ? `${completedCount}건 실천 중` : '미실천'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                      {weeklyDays.map((d, idx) => {
                        const isDone = d === '오늘' ? completionRate >= 75 : false;
                        return (
                          <div key={idx} style={{ flex: 1, textAlign: 'center', background: '#ffffff', padding: '4px 0', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '2px' }}>{d}</div>
                            <div style={{ fontSize: '11px' }}>{isDone ? '🟢' : '⚪'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* CARD 3: 📈 체중 & 체온 추이 차트 (좌하단) */}
              {/* ------------------------------------------------------------ */}
              <div className="glass-card" style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📈</span> 체중 & 체온 추이
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddLogModal(true)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#059669',
                        cursor: 'pointer'
                      }}
                    >
                      + 기록 추가
                    </button>
                  </div>

                  {/* SVG Chart or Empty State */}
                  {vitalHistory && vitalHistory.length > 0 ? (
                    <div style={{ background: '#fafbfc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px 10px 6px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', fontSize: '10.5px', fontWeight: '700', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span> 몸무게 (kg)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span> 체온 (°C)
                        </span>
                      </div>

                      <svg viewBox="0 0 320 90" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                        <line x1="20" y1="15" x2="300" y2="15" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="20" y1="45" x2="300" y2="45" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="20" y1="70" x2="300" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />

                        {(() => {
                          const count = vitalHistory.length;
                          const minW = Math.min(...vitalHistory.map(h => h.weight)) - 0.2;
                          const maxW = Math.max(...vitalHistory.map(h => h.weight)) + 0.2;
                          const rangeW = maxW - minW || 1;

                          const pointsW = vitalHistory.map((item, idx) => {
                            const x = count === 1 ? 160 : 30 + (idx * (260 / (count - 1)));
                            const y = 65 - ((item.weight - minW) / rangeW) * 45;
                            return { x, y, val: item.weight, date: item.date };
                          });

                          const pathStr = pointsW.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                          return (
                            <g>
                              {count > 1 && (
                                <path d={pathStr} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              )}
                              {pointsW.map((p, i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#059669" strokeWidth="2" />
                                  <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8.5" fill="#047857" fontWeight="bold">
                                    {p.val}kg
                                  </text>
                                  <text x={p.x} y={84} textAnchor="middle" fontSize="8.5" fill="#94a3b8" fontWeight="600">
                                    {p.date}
                                  </text>
                                </g>
                              ))}
                            </g>
                          );
                        })()}
                      </svg>

                      <div style={{ marginTop: '8px', background: '#ecfdf5', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>💡 최근 {vitalHistory.length}건의 측정 지표 기록</span>
                        <span style={{ fontWeight: '800' }}>기록 완료</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fafbfc', borderRadius: '12px', border: '1px dashed #e2e8f0', padding: '36px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        등록된 체중 및 체온 기록이 없습니다
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '12px' }}>
                        아이의 주기적인 체중과 체온을 기록하여 건강 변화 추이를 확인해 보세요.
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddLogModal(true)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #059669', background: '#ffffff', color: '#059669', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + 첫 측정치 기록하기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* CARD 4: ⏰ 케어 일정 & D-Day (우하단) */}
              {/* ------------------------------------------------------------ */}
              <div className="glass-card" style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⏰</span> 케어 일정 & D-Day
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(true)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#059669',
                        cursor: 'pointer'
                      }}
                    >
                      + 일정 등록
                    </button>
                  </div>

                  {/* Reminder Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {reminders && reminders.length > 0 ? (
                      reminders.map(rem => {
                        const dDayText = getDDay(rem.targetDate);
                        const isUrgent = dDayText.includes('D-') && parseInt(dDayText.replace('D-', '')) <= 10;
                        return (
                          <div
                            key={rem.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: rem.completed ? '1px solid #cbd5e1' : isUrgent ? '1.5px solid #fbbf24' : '1px solid #e2e8f0',
                              background: rem.completed ? '#f8fafc' : isUrgent ? '#fffbeb' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px' }}>{rem.icon || '💊'}</span>
                              <div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: rem.completed ? '#94a3b8' : '#0f172a', textDecoration: rem.completed ? 'line-through' : 'none' }}>
                                  {rem.title}
                                </span>
                                <span style={{ fontSize: '10.5px', color: '#94a3b8', marginLeft: '6px' }}>
                                  ({rem.targetDate ? rem.targetDate.slice(5) : ''})
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '800',
                                padding: '2px 7px',
                                borderRadius: '9999px',
                                background: rem.completed ? '#e2e8f0' : isUrgent ? '#fef3c7' : '#ecfdf5',
                                color: rem.completed ? '#64748b' : isUrgent ? '#b45309' : '#047857'
                              }}>
                                {rem.completed ? '완료' : dDayText}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleReminderComplete(rem.id)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', padding: '2px' }}
                                title={rem.completed ? '미완료로 변경' : '완료 체크'}
                              >
                                {rem.completed ? '↩️' : '✔️'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReminder(rem.id)}
                                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: '2px' }}
                                title="일정 삭제"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ background: '#fafbfc', borderRadius: '10px', border: '1px dashed #e2e8f0', padding: '20px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748b', marginBottom: '2px' }}>
                          등록된 케어 일정이 없습니다
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                          예방약 복용일, 백신 접종일, 정기 검진일을 등록해 보세요.
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowScheduleModal(true)}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #059669', background: '#ffffff', color: '#059669', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          + 새 일정 등록
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Recent Diagnosis Summary */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px' }}>
                  {recentDiagnosis ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                          📋 최근 진단: {recentDiagnosis.diseaseName || recentDiagnosis.suspectedDisease || '질환 분석 완료'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '2px 7px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          {recentDiagnosis.riskLevel || '분석 완료'}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4', margin: '0 0 4px 0' }}>
                        {recentDiagnosis.doctorOpinion || recentDiagnosis.summary || '소견이 등록되어 있습니다.'}
                      </p>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                          📋 최근 AI 질병 진단 기록 없음
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                          환부 사진을 업로드하여 실시간 질환 확률을 진단해 보세요.
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ textAlign: 'right', marginTop: '6px' }}>
                    <span
                      onClick={onNavigateDiagnosis}
                      style={{ fontSize: '11px', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
                    >
                      진단 스튜디오 바로가기 ➔
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </div>


      {/* ============================================================ */}
      {/* 🚀 MODAL 1: 📅 케어 일정 등록 전용 팝업 모달 */}
      {/* ============================================================ */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⏰</span> 케어 일정 & D-Day 등록
              </h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReminder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  일정 분류
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {[
                    { tag: '예방약', icon: '💊' },
                    { tag: '백신', icon: '💉' },
                    { tag: '검진', icon: '🩺' },
                    { tag: '미용', icon: '✂️' },
                    { tag: '기념일', icon: '🎂' }
                  ].map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setNewReminder({ ...newReminder, tag: item.tag, icon: item.icon })}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: newReminder.tag === item.tag ? '2px solid #059669' : '1px solid #cbd5e1',
                        background: newReminder.tag === item.tag ? '#ecfdf5' : '#ffffff',
                        color: newReminder.tag === item.tag ? '#047857' : '#475569',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{item.icon}</span>
                      <span>{item.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  일정 이름
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 심장사상충 예방약 급여, 1차 정기검진"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  예정일자 (D-Day 기준일)
                </label>
                <input
                  type="date"
                  required
                  value={newReminder.targetDate}
                  onChange={(e) => setNewReminder({ ...newReminder, targetDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)' }}
                >
                  일정 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🚀 MODAL 2: 📈 체중 & 체온 기록 전용 팝업 모달 */}
      {/* ============================================================ */}
      {showAddLogModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                📈 체중 & 체온 측정치 기록
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVitalRecord} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  몸무게 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="예: 3.5"
                  value={newLog.weight}
                  onChange={(e) => setNewLog({ ...newLog, weight: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  체온 (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="예: 38.5"
                  value={newLog.temp}
                  onChange={(e) => setNewLog({ ...newLog, temp: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: '600', marginTop: '2px', display: 'block' }}>정상 체온 범위: 37.5 ~ 39.0°C</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  측정 일자 (선택)
                </label>
                <input
                  type="date"
                  value={newLog.date}
                  onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
                >
                  차트에 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🚀 MODAL 3: 🎯 케어 체크리스트 항목 추가 모달 */}
      {/* ============================================================ */}
      {showAddChecklistModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                🎯 맞춤 케어 항목 추가
              </h3>
              <button
                type="button"
                onClick={() => setShowAddChecklistModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomCheckItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  케어 항목명
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 🪥 치아 양치질, 🪮 털 빗질"
                  value={newCheckItem.label}
                  onChange={(e) => setNewCheckItem({ ...newCheckItem, label: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  간단한 설명
                </label>
                <input
                  type="text"
                  placeholder="예: 치석 예방 및 잇몸 관리"
                  value={newCheckItem.desc}
                  onChange={(e) => setNewCheckItem({ ...newCheckItem, desc: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddChecklistModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
                >
                  체크리스트에 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}




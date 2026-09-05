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
  
  // Real selected pet only (no mock data fallback)
  const currentPet = selectedPet || null;
  const petIdKey = currentPet ? `pet_${currentPet.id}` : 'pet_none';

  // 1. PHR Vitals Profile State (Empty by default)
  const [vitals, setVitals] = useState({
    bodyTemp: '',
    heartRate: '',
    weight: '',
    allergies: '',
    conditions: '',
    medications: ''
  });

  // 2. Daily Checklist Items & State
  const [checklistItems, setChecklistItems] = useState([
    { key: 'water', label: '수분 섭취', desc: '체내 수분 보충' },
    { key: 'walk', label: '산책 30분', desc: '관절 & 스트레스 케어' },
    { key: 'snack', label: '간식 조절', desc: '칼로리 과다 방지' },
    { key: 'medication', label: '소독/약 투여', desc: '처방 케어 지키기' }
  ]);
  const [dailyChecklist, setDailyChecklist] = useState({});
  const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState({ label: '', desc: '' });
  const [showBulkChecklistModal, setShowBulkChecklistModal] = useState(false);
  const [bulkChecklistDraft, setBulkChecklistDraft] = useState([]);

  // 3. Vitals & Weight History (Empty by default)
  const [vitalHistory, setVitalHistory] = useState([]);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [editingLogIndex, setEditingLogIndex] = useState(null);
  const [newLog, setNewLog] = useState({ weight: '', temp: '', date: '' });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRecords, setBulkRecords] = useState([]);

  // 4. Care Reminders (Empty by default)
  const [reminders, setReminders] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    targetDate: '',
    tag: '예방약',
    icon: '💊'
  });

  // 5. Recent Diagnosis State
  const [recentDiagnosis, setRecentDiagnosis] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [chartMetric, setChartMetric] = useState('all'); // 'all' | 'weight' | 'temp'

  // Check login state: prop or localStorage fallback
  const isUserLoggedIn = !!user || !!localStorage.getItem('petcare_user');

  useEffect(() => {
    if (!currentPet) {
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
        bodyTemp: currentPet.bodyTemp || currentPet.healthProfile?.bodyTemp || '',
        heartRate: currentPet.heartRate || currentPet.healthProfile?.heartRate || '',
        weight: currentPet.weight ? String(currentPet.weight).replace('kg', '') : '',
        allergies: currentPet.allergies || currentPet.healthProfile?.allergies || '',
        conditions: currentPet.conditions || currentPet.healthProfile?.conditions || '',
        medications: currentPet.medications || currentPet.healthProfile?.medications || ''
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

    // 5. Load Recent Diagnosis
    const allRecords = localStorage.getItem('petcare_diagnosis_records');
    if (allRecords) {
      try {
        const parsed = JSON.parse(allRecords);
        const petRecords = parsed.filter(r => String(r.petId) === String(currentPet.id));
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
  }, [currentPet, petIdKey]);


  const handleVitalChange = (e) => {
    const { name, value } = e.target;
    setVitals(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveVitals = (e) => {
    e.preventDefault();
    setIsSaved(true);
    localStorage.setItem(`petcare_vitals_${petIdKey}`, JSON.stringify(vitals));

    // 💡 체온과 체중을 변화 곡선(vitalHistory)에도 자동 동기화 반영
    const w = parseFloat(vitals.weight) || 0;
    const t = parseFloat(vitals.bodyTemp) || 0;

    if (w > 0 || t > 0) {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
      
      let updatedHistory;
      const todayIdx = vitalHistory.findIndex(h => h.date === todayStr);

      if (todayIdx >= 0) {
        updatedHistory = vitalHistory.map((h, i) => 
          i === todayIdx ? { ...h, weight: w || h.weight, temp: t || h.temp } : h
        );
      } else {
        updatedHistory = [...vitalHistory.slice(-9), { date: todayStr, weight: w || 0, temp: t || 0 }];
      }

      setVitalHistory(updatedHistory);
      localStorage.setItem(`petcare_history_${petIdKey}`, JSON.stringify(updatedHistory));
    }

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

  const toggleDailyCheck = (key) => {
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

  const handleOpenBulkChecklist = () => {
    setBulkChecklistDraft(checklistItems.map(item => ({ ...item })));
    setShowBulkChecklistModal(true);
  };

  const handleUpdateBulkDraftItem = (index, field, value) => {
    setBulkChecklistDraft(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAddBulkDraftRow = () => {
    const key = `custom_${Date.now()}`;
    setBulkChecklistDraft(prev => [...prev, { key, label: '', desc: '' }]);
  };

  const handleDeleteBulkDraftRow = (index) => {
    setBulkChecklistDraft(prev => prev.filter((_, i) => i !== index));
  };

  const handleResetBulkDraftToDefault = () => {
    setBulkChecklistDraft([
      { key: 'water', label: '수분 섭취', desc: '체내 수분 보충' },
      { key: 'walk', label: '산책 30분', desc: '관절 & 스트레스 케어' },
      { key: 'snack', label: '간식 조절', desc: '칼로리 과다 방지' },
      { key: 'medication', label: '소독/약 투여', desc: '처방 케어 지키기' }
    ]);
  };

  const handleSaveBulkChecklist = (e) => {
    if (e) e.preventDefault();
    const validItems = bulkChecklistDraft.filter(item => item.label && item.label.trim().length > 0);
    setChecklistItems(validItems);
    localStorage.setItem(`petcare_checkitems_${petIdKey}`, JSON.stringify(validItems));

    // 삭제된 키는 dailyChecklist에서도 정리
    const validKeySet = new Set(validItems.map(item => item.key));
    setDailyChecklist(prev => {
      const next = {};
      Object.keys(prev).forEach(k => {
        if (validKeySet.has(k)) next[k] = prev[k];
      });
      localStorage.setItem(`petcare_checklist_${petIdKey}`, JSON.stringify(next));
      return next;
    });

    setShowBulkChecklistModal(false);
  };

  const handleDeleteCheckItem = (e, key) => {
    e.stopPropagation();
    const updated = checklistItems.filter(item => item.key !== key);
    setChecklistItems(updated);
    localStorage.setItem(`petcare_checkitems_${petIdKey}`, JSON.stringify(updated));
    setDailyChecklist(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem(`petcare_checklist_${petIdKey}`, JSON.stringify(next));
      return next;
    });
  };

  const completedCount = checklistItems.filter(item => dailyChecklist[item.key]).length;
  const completionRate = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  const handleOpenAddLog = () => {
    setEditingLogIndex(null);
    setNewLog({ weight: vitals.weight || '', temp: vitals.bodyTemp || '', date: '' });
    setShowAddLogModal(true);
  };

  const handleOpenEditLog = (idx) => {
    const target = vitalHistory[idx];
    if (!target) return;
    setEditingLogIndex(idx);
    setNewLog({
      weight: target.weight !== undefined ? String(target.weight) : '',
      temp: target.temp !== undefined ? String(target.temp) : '',
      date: target.date || ''
    });
    setShowAddLogModal(true);
  };

  const handleDeleteVitalRecord = (idx) => {
    if (!window.confirm('선택하신 측정치 기록을 삭제하시겠습니까?')) return;
    const updated = vitalHistory.filter((_, i) => i !== idx);
    setVitalHistory(updated);
    localStorage.setItem(`petcare_history_${petIdKey}`, JSON.stringify(updated));
  };

  const handleSaveVitalRecord = (e) => {
    e.preventDefault();
    if (!newLog.weight && !newLog.temp) return;
    const w = parseFloat(newLog.weight) || (vitals.weight ? parseFloat(vitals.weight) : 0);
    const t = parseFloat(newLog.temp) || (vitals.bodyTemp ? parseFloat(vitals.bodyTemp) : 0);
    
    let dateStr = newLog.date;
    if (!dateStr) {
      const today = new Date();
      dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    } else {
      dateStr = dateStr.includes('-') ? dateStr.slice(5).replace('-', '/') : dateStr;
    }

    let updatedHistory;
    if (editingLogIndex !== null && editingLogIndex >= 0) {
      // 수정 모드
      updatedHistory = vitalHistory.map((item, idx) => {
        if (idx === editingLogIndex) {
          return { ...item, weight: w, temp: t, date: dateStr };
        }
        return item;
      });
    } else {
      // 신규 추가 모드
      updatedHistory = [...vitalHistory.slice(-9), { date: dateStr, weight: w, temp: t }];
    }

    setVitalHistory(updatedHistory);
    localStorage.setItem(`petcare_history_${petIdKey}`, JSON.stringify(updatedHistory));
    
    if (w > 0) setVitals(prev => ({ ...prev, weight: String(w) }));
    if (t > 0) setVitals(prev => ({ ...prev, bodyTemp: String(t) }));
    
    setNewLog({ weight: '', temp: '', date: '' });
    setEditingLogIndex(null);
    setShowAddLogModal(false);
  };

  // 🌟 Bulk Vital History Table Editor Handlers
  const handleOpenBulkModal = () => {
    if (vitalHistory && vitalHistory.length > 0) {
      setBulkRecords(vitalHistory.map(r => ({
        date: r.date || '',
        weight: r.weight !== undefined ? String(r.weight) : '',
        temp: r.temp !== undefined ? String(r.temp) : ''
      })));
    } else {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
      setBulkRecords([
        { date: todayStr, weight: vitals.weight || '', temp: vitals.bodyTemp || '' }
      ]);
    }
    setShowBulkModal(true);
  };

  const handleAddBulkRow = () => {
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    setBulkRecords(prev => [...prev, { date: todayStr, weight: '', temp: '' }]);
  };

  const handleUpdateBulkRow = (idx, field, value) => {
    setBulkRecords(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDeleteBulkRow = (idx) => {
    setBulkRecords(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveBulkRecords = (e) => {
    if (e) e.preventDefault();
    const validRecords = bulkRecords
      .filter(r => (r.weight && !isNaN(parseFloat(r.weight))) || (r.temp && !isNaN(parseFloat(r.temp))))
      .map(r => ({
        date: r.date ? (r.date.includes('-') ? r.date.slice(5).replace('-', '/') : r.date) : '01/01',
        weight: parseFloat(r.weight) || 0,
        temp: parseFloat(r.temp) || 0
      }));

    setVitalHistory(validRecords);
    localStorage.setItem(`petcare_history_${petIdKey}`, JSON.stringify(validRecords));

    if (validRecords.length > 0) {
      const last = validRecords[validRecords.length - 1];
      if (last.weight > 0) setVitals(prev => ({ ...prev, weight: String(last.weight) }));
      if (last.temp > 0) setVitals(prev => ({ ...prev, bodyTemp: String(last.temp) }));
    }

    setShowBulkModal(false);
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

  const handleDeleteReminder = (id) => {
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id);
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

  // ------------------------------------------------------------
  // 🌟 CASE 1: 등록된 반려동물이 없는 경우 (Clean Empty State)
  // ------------------------------------------------------------
  if (!currentPet) {
    return (
      <section id="dashboard-section" style={{ padding: '60px 0 90px 0', background: 'var(--bg-main)', minHeight: '85vh' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '32px',
            padding: '64px 36px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 20px 50px -15px rgba(15, 23, 42, 0.06)'
          }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 24px auto',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
            }}>
              🐾
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0b0f19', margin: '0 0 12px 0', letterSpacing: '-0.8px' }}>
              등록된 반려동물이 없습니다
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '480px', margin: '0 auto 36px auto', lineHeight: '1.65', fontWeight: '500' }}>
              반려동물을 먼저 등록하시면 실시간 바이탈, 체중 & 체온 변화 곡선, 1초 데일리 케어 루틴을 체계적으로 관리할 수 있습니다.
            </p>

            <button
              type="button"
              onClick={() => onOpenEditPet && onOpenEditPet(null)}
              className="card-hover-lift"
              style={{
                padding: '14px 40px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              + 첫 반려동물 등록하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------
  // 🌟 CASE 2: 반려동물이 선택된 경우 (Apple Health High-End Dashboard)
  // ------------------------------------------------------------
  const nextReminder = reminders && reminders.length > 0 ? reminders.find(r => !r.completed) || reminders[0] : null;

  // 💡 변화 곡선(vitalHistory)과 100% 실시간 연동되는 최신 체온/체중 및 변화량
  const latestVitalRecord = vitalHistory && vitalHistory.length > 0 ? vitalHistory[vitalHistory.length - 1] : null;
  const prevVitalRecord = vitalHistory && vitalHistory.length > 1 ? vitalHistory[vitalHistory.length - 2] : null;

  const currentTemp = (latestVitalRecord?.temp && Number(latestVitalRecord.temp) > 0)
    ? String(latestVitalRecord.temp)
    : (vitals.bodyTemp || '');

  const currentWeight = (latestVitalRecord?.weight && Number(latestVitalRecord.weight) > 0)
    ? String(latestVitalRecord.weight)
    : (vitals.weight || (currentPet?.weight ? String(currentPet.weight).replace('kg', '') : ''));

  const tempDiff = (latestVitalRecord?.temp && prevVitalRecord?.temp)
    ? (parseFloat(latestVitalRecord.temp) - parseFloat(prevVitalRecord.temp)).toFixed(1)
    : null;

  const weightDiff = (latestVitalRecord?.weight && prevVitalRecord?.weight)
    ? (parseFloat(latestVitalRecord.weight) - parseFloat(prevVitalRecord.weight)).toFixed(1)
    : null;

  return (
    <section id="dashboard-section" style={{ padding: '36px 0 80px 0', background: 'var(--bg-main)', minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: '1240px' }}>

        {/* ============================================================ */}
        {/* 🌟 1. PROFILE HEADER & PET SELECTOR STRIP */}
        {/* ============================================================ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
        }}>
          {/* Left: Pet Main Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '62px',
              height: '62px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 6px 18px rgba(16, 185, 129, 0.15)'
            }}>
              {currentPet.icon || '🐾'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.6px' }}>
                  {currentPet.name}
                </h2>
                <span style={{ fontSize: '11.5px', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '9999px', fontWeight: '800' }}>
                  {currentPet.breed || '반려동물'}
                </span>
                <span style={{ fontSize: '11px', color: '#047857', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #86efac', padding: '2px 9px', borderRadius: '9999px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✨</span>
                  <span>AI 건강 컨디션: 안정 🟢</span>
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{currentPet.species || '반려동물'}</span>
                {currentPet.age && <span>· {currentPet.age}세</span>}
                {currentPet.gender && <span>· {currentPet.gender}</span>}
                {currentPet.neutered && <span>· 중성화 완료</span>}
              </div>
            </div>
          </div>

          {/* Right: Switcher & Edit Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {pets && pets.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(241, 245, 249, 0.85)', padding: '4px 6px', borderRadius: '9999px', border: '1px solid rgba(226, 232, 240, 0.85)' }}>
                {pets.map(pet => {
                  const isCurrent = currentPet.id === pet.id;
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPet(pet)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: 'none',
                        background: isCurrent ? '#ffffff' : 'transparent',
                        color: isCurrent ? '#0b0f19' : '#64748b',
                        fontWeight: isCurrent ? '800' : '600',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: isCurrent ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {pet.icon || '🐾'} {pet.name}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenEditPet && onOpenEditPet(currentPet)}
              className="card-hover-lift"
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                background: '#ffffff',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
              }}
            >
              ⚙️ 반려동물 정보 수정
            </button>

            <button
              type="button"
              onClick={() => onOpenEditPet && onOpenEditPet(null)}
              className="card-hover-lift"
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: '#0b0f19',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(11, 15, 25, 0.2)'
              }}
            >
              + 반려동물 추가
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 🌟 SUBTAB SEGMENTED CAPSULE BAR (바이탈 / 일상 AI / 타임라인) */}
        {/* ============================================================ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '26px'
        }}>
          <div style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(241, 245, 249, 0.85)',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            {[
              { id: 'phr', label: '바이탈 & 건강 대시보드', icon: '📊' },
              { id: 'daily-ai', label: '일상 맞춤 AI 챗봇', icon: '🤖' },
              { id: 'timeline', label: '증상 경과 타임라인', icon: '🔍' }
            ].map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className="card-hover-lift"
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#0b0f19' : '#64748b',
                    background: isActive ? '#ffffff' : 'transparent',
                    border: isActive ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid transparent',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? '0 4px 14px rgba(15, 23, 42, 0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onNavigateDiagnosis}
            type="button"
            className="card-hover-lift"
            style={{
              padding: '9px 20px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🩺</span>
            <span>AI 질병 진단 바로가기 ➔</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* SUBTAB 2: 🤖 일상 맞춤 AI 챗봇 뷰 */}
        {/* ============================================================ */}
        {activeSubTab === 'daily-ai' && (
          <DailyCareChatbot selectedPet={currentPet} />
        )}

        {/* ============================================================ */}
        {/* SUBTAB 3: 🔍 증상 경과 관찰 타임라인 뷰 */}
        {/* ============================================================ */}
        {activeSubTab === 'timeline' && (
          <TimelineSlider selectedPet={currentPet} />
        )}

        {/* ============================================================ */}
        {/* SUBTAB 1: 📊 바이탈 & 헬스케어 메인 대시보드 뷰 */}
        {/* ============================================================ */}
        {activeSubTab === 'phr' && (
          <>

        {/* ============================================================ */}
        {/* 🌟 2. 4-BENTO KPI METRICS STRIP (Apple Health Luxury Style) */}
        {/* ============================================================ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          marginBottom: '26px'
        }}>
          {/* KPI 1: 체온 */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '22px 24px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>최근 체온</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: currentTemp && (parseFloat(currentTemp) >= 37.5 && parseFloat(currentTemp) <= 39.2) ? '#059669' : '#d97706',
                  background: currentTemp && (parseFloat(currentTemp) >= 37.5 && parseFloat(currentTemp) <= 39.2) ? '#ecfdf5' : '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  {currentTemp ? (parseFloat(currentTemp) >= 37.5 && parseFloat(currentTemp) <= 39.2 ? '정상 모니터링' : '체온 주의') : '기록 필요'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#0b0f19', letterSpacing: '-0.8px' }}>
                  {currentTemp || '-'}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#64748b' }}>°C</span>
              </div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ height: '5px', width: '100%', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: currentTemp ? `${Math.min(100, Math.max(10, ((parseFloat(currentTemp) - 35) / 6) * 100))}%` : '50%',
                  background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)',
                  borderRadius: '9999px'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '5px', fontWeight: '600' }}>
                <span>{tempDiff !== null ? `변화 곡선 반영 (${tempDiff >= 0 ? '+' : ''}${tempDiff}°C)` : '정상치 37.5°C'}</span>
                <span>39.0°C</span>
              </div>
            </div>
          </div>

          {/* KPI 2: 체중 */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '22px 24px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>최근 체중</span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '9999px' }}>
                  {weightDiff !== null ? `변화 곡선 (${weightDiff >= 0 ? '+' : ''}${weightDiff}kg)` : (vitalHistory.length >= 2 ? '변화 추적 중' : '기초 등록')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#059669', letterSpacing: '-0.8px' }}>
                  {currentWeight || '-'}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>kg</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '14px', background: '#f8fafc', padding: '6px 10px', borderRadius: '10px' }}>
              ⚖️ {currentPet?.breed || '반려동물'} 기준 체중 관리 권장
            </div>
          </div>

          {/* KPI 3: 데일리 케어 실천율 */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '22px 24px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '10px' }}>
                오늘 케어 실천
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#2563eb', letterSpacing: '-0.8px' }}>
                  {completionRate}
                </span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb' }}>%</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '6px' }}>
                {checklistItems.length}개 중 {completedCount}개 완료
              </div>
            </div>

            {/* SVG Circular Progress Ring */}
            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="23" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="5"
                  strokeDasharray="144.5"
                  strokeDashoffset={144.5 - (144.5 * completionRate) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                🎯
              </div>
            </div>
          </div>

          {/* KPI 4: 다음 케어 D-Day */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '22px 24px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>다음 케어 D-Day</span>
                <span style={{ fontSize: '18px' }}>⏰</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: nextReminder ? '#db2777' : '#94a3b8', letterSpacing: '-0.8px' }}>
                {nextReminder ? getDDay(nextReminder.targetDate) : '일정 없음'}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '700', marginTop: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextReminder ? `${nextReminder.icon || '💊'} ${nextReminder.title}` : '새 일정을 등록하세요'}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 🌟 3. MAIN WIDE CARD: 📈 체중 & 체온 변화 추이 차트 */}
        {/* ============================================================ */}
        <div className="card-hover-lift" style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '28px',
          padding: '28px 32px',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          boxShadow: '0 10px 35px -10px rgba(15, 23, 42, 0.05)',
          marginBottom: '26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                border: '1px solid #bfdbfe'
              }}>
                📈
              </div>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                  체중 & 체온 변화 추이
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>
                  일자별 측정 기록 시각화 및 정상 범위 모니터링
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="card-hover-lift"
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  background: '#ecfdf5',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  color: '#047857',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>📋</span>
                <span>기록 전체 일괄 편집</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddLog}
                className="card-hover-lift"
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  background: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#2563eb',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
                }}
              >
                + 빠른 기록
              </button>
            </div>
          </div>

          {/* Chart or Pure Empty State */}
          {vitalHistory && vitalHistory.length >= 2 ? (
            <div>
              <div style={{ background: '#fafbfc', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '18px 20px 14px 20px', marginBottom: '16px' }}>
                
                {/* Metric Selector & Legend Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(241, 245, 249, 0.9)', padding: '3px', borderRadius: '9999px', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
                    {[
                      { id: 'all', label: '전체 듀얼 뷰', icon: '📈' },
                      { id: 'weight', label: '몸무게만', icon: '⚖️' },
                      { id: 'temp', label: '체온만', icon: '🌡️' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setChartMetric(tab.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          border: 'none',
                          background: chartMetric === tab.id ? '#ffffff' : 'transparent',
                          color: chartMetric === tab.id ? '#0b0f19' : '#64748b',
                          fontSize: '11.5px',
                          fontWeight: chartMetric === tab.id ? '800' : '600',
                          cursor: 'pointer',
                          boxShadow: chartMetric === tab.id ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontWeight: '700' }}>
                    {(chartMetric === 'all' || chartMetric === 'weight') && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                        <span style={{ width: '12px', height: '3px', background: '#059669', borderRadius: '2px', display: 'inline-block' }}></span> 몸무게 (kg)
                      </span>
                    )}
                    {(chartMetric === 'all' || chartMetric === 'temp') && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                        <span style={{ width: '12px', height: '3px', background: '#f59e0b', borderRadius: '2px', display: 'inline-block' }}></span> 체온 (°C)
                      </span>
                    )}
                  </div>
                </div>

                {/* Dual SVG Line Chart with Gradient Glow */}
                <svg viewBox="0 0 520 130" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="20" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="20" y1="58" x2="500" y2="58" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="20" y1="96" x2="500" y2="96" stroke="#f1f5f9" strokeDasharray="3 3" />

                  {(() => {
                    const count = vitalHistory.length;

                    // 1. Weight calculation
                    const rawWeights = vitalHistory.map(h => parseFloat(h.weight) || 0).filter(v => v > 0);
                    const minW = rawWeights.length > 0 ? Math.min(...rawWeights) - 0.2 : 0;
                    const maxW = rawWeights.length > 0 ? Math.max(...rawWeights) + 0.2 : 10;
                    const rangeW = maxW - minW || 1;

                    const pointsW = vitalHistory.map((item, idx) => {
                      const w = parseFloat(item.weight) || minW;
                      const x = count === 1 ? 260 : 30 + (idx * (460 / (count - 1)));
                      const y = 90 - ((w - minW) / rangeW) * 65;
                      return { x, y, val: item.weight, date: item.date };
                    });

                    // 2. Temperature calculation
                    const rawTemps = vitalHistory.map(h => parseFloat(h.temp) || 0).filter(v => v > 0);
                    const minT = rawTemps.length > 0 ? Math.min(...rawTemps) - 0.2 : 36.5;
                    const maxT = rawTemps.length > 0 ? Math.max(...rawTemps) + 0.2 : 40.0;
                    const rangeT = maxT - minT || 1;

                    const pointsT = vitalHistory.map((item, idx) => {
                      const t = parseFloat(item.temp) || minT;
                      const x = count === 1 ? 260 : 30 + (idx * (460 / (count - 1)));
                      const y = 90 - ((t - minT) / rangeT) * 65;
                      return { x, y, val: item.temp || '-', date: item.date };
                    });

                    const pathStrW = pointsW.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaStrW = count > 1 ? `${pathStrW} L ${pointsW[count - 1].x} 100 L ${pointsW[0].x} 100 Z` : '';

                    const pathStrT = pointsT.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaStrT = count > 1 ? `${pathStrT} L ${pointsT[count - 1].x} 100 L ${pointsT[0].x} 100 Z` : '';

                    return (
                      <g>
                        {/* Weight Area & Line */}
                        {(chartMetric === 'all' || chartMetric === 'weight') && (
                          <g>
                            {count > 1 && <path d={areaStrW} fill="url(#weightAreaGrad)" />}
                            {count > 1 && (
                              <path d={pathStrW} fill="none" stroke="#059669" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                            {pointsW.map((p, i) => (
                              <g key={`w-${i}`}>
                                <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#059669" strokeWidth="3" />
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10.5" fill="#047857" fontWeight="bold">
                                  {p.val}kg
                                </text>
                              </g>
                            ))}
                          </g>
                        )}

                        {/* Temperature Area & Line */}
                        {(chartMetric === 'all' || chartMetric === 'temp') && (
                          <g>
                            {count > 1 && <path d={areaStrT} fill="url(#tempAreaGrad)" />}
                            {count > 1 && (
                              <path
                                d={pathStrT}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2.8"
                                strokeDasharray={chartMetric === 'all' ? '5 3' : 'none'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            {pointsT.map((p, i) => (
                              <g key={`t-${i}`}>
                                <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#f59e0b" strokeWidth="3" />
                                <text x={p.x} y={p.y + 16} textAnchor="middle" fontSize="10" fill="#b45309" fontWeight="bold">
                                  {p.val}°C
                                </text>
                              </g>
                            ))}
                          </g>
                        )}

                        {/* Date X-Axis Labels */}
                        {pointsW.map((p, i) => (
                          <text key={`date-${i}`} x={p.x} y={120} textAnchor="middle" fontSize="9.5" fill="#94a3b8" fontWeight="600">
                            {p.date}
                          </text>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248, 250, 252, 0.8)', padding: '12px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  <strong style={{ color: '#047857' }}>총 {vitalHistory.length}건 기록됨</strong>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                  <span>최근 측정: {vitalHistory[vitalHistory.length - 1]?.date} (체중 {vitalHistory[vitalHistory.length - 1]?.weight}kg / 체온 {vitalHistory[vitalHistory.length - 1]?.temp || '-'}°C)</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenBulkModal}
                  style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '12.5px', fontWeight: '800', cursor: 'pointer' }}
                >
                  전체 기록 표로 수정하기 ➔
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fafbfc', borderRadius: '22px', border: '1px dashed #cbd5e1', padding: '44px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
              <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#0b0f19', margin: '0 0 6px 0' }}>
                등록된 체중 및 체온 측정치가 없습니다
              </h4>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px auto', lineHeight: '1.55' }}>
                측정 기록을 남기시면 일자별 곡선 그래프가 자동으로 그려집니다. 상단의 [기록 전체 일괄 편집]으로 여러 날짜를 한 번에 입력할 수도 있습니다.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleOpenBulkModal}
                  className="card-hover-lift"
                  style={{
                    padding: '9px 22px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
                  }}
                >
                  📋 기록 테이블로 입력하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 🌟 4. LUXURY BALANCED BENTO GRID: ROW 1 (50:50) & ROW 2 (3-COLUMN) */}
        {/* ============================================================ */}
        
        {/* --- ROW 1: 스마트 바이탈 관리 (50%) & 1초 데일리 케어 루틴 (50%) --- */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '22px',
          marginBottom: '24px'
        }}>
          
          {/* LEFT 50%: 🩺 스마트 기초 바이탈 & 건강 프로필 매니저 */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '26px',
            padding: '28px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 30px -8px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                    border: '1.5px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px'
                  }}>
                    🩺
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                      기초 바이탈 & 건강 프로필
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      실시간 정상 지표 비교 및 맞춤 관리
                    </span>
                  </div>
                </div>

                {isSaved && (
                  <span style={{ fontSize: '11.5px', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '9999px', fontWeight: '800' }}>
                    ✓ 저장 완료
                  </span>
                )}
              </div>

              <form id="vital-profile-form" onSubmit={handleSaveVitals} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 3 Core Vital Smart Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Tile 1: 체온 */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                      <span>체온</span>
                      <span>🌡️</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        name="bodyTemp"
                        value={vitals.bodyTemp || currentTemp}
                        onChange={handleVitalChange}
                        placeholder="38.5"
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: '900', color: '#0b0f19', outline: 'none', padding: 0 }}
                      />
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>°C</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                      변화 곡선 반영 (정상 37.5~39.0)
                    </div>
                  </div>

                  {/* Tile 2: 심박수 */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                      <span>심박수</span>
                      <span>💓</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        name="heartRate"
                        value={vitals.heartRate}
                        onChange={handleVitalChange}
                        placeholder="95"
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: '900', color: '#0b0f19', outline: 'none', padding: 0 }}
                      />
                      <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '700' }}>bpm</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', marginTop: '4px' }}>
                      안정 70~140
                    </div>
                  </div>

                  {/* Tile 3: 몸무게 */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                      <span>몸무게</span>
                      <span>⚖️</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        name="weight"
                        value={vitals.weight || currentWeight}
                        onChange={handleVitalChange}
                        placeholder="2.0"
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: '900', color: '#059669', outline: 'none', padding: 0 }}
                      />
                      <span style={{ fontSize: '13px', color: '#059669', fontWeight: '700' }}>kg</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#047857', fontWeight: '700', marginTop: '4px' }}>
                      변화 곡선 반영
                    </div>
                  </div>
                </div>

                {/* Health Specifics Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                      🌾 알레르기 유발 성분
                    </label>
                    <input
                      type="text"
                      name="allergies"
                      value={vitals.allergies}
                      onChange={handleVitalChange}
                      placeholder="예: 닭고기, 특정 곡물, 유제품 알레르기 등"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                      ⚠️ 기저 질환 & 주의 병력
                    </label>
                    <input
                      type="text"
                      name="conditions"
                      value={vitals.conditions}
                      onChange={handleVitalChange}
                      placeholder="예: 슬개골 탈구, 피부염 재발 이력, 백내장 등"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                      💊 현재 복용 약물 / 처방식
                    </label>
                    <input
                      type="text"
                      name="medications"
                      value={vitals.medications}
                      onChange={handleVitalChange}
                      placeholder="예: 관절 영양제, 심장약, 유리너리 처방식 등"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </form>
            </div>

            <button
              form="vital-profile-form"
              type="submit"
              className="card-hover-lift"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                fontSize: '13.5px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                marginTop: '16px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>💾</span>
              <span>바이탈 & 프로필 저장하기</span>
            </button>
          </div>

          {/* RIGHT 50%: 🎯 오늘의 1초 데일리 루틴 케어 */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '26px',
            padding: '28px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 30px -8px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>🎯</span>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                      오늘의 1초 데일리 케어
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      원터치 건강 습관 기록 및 실천
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleOpenBulkChecklist}
                    className="card-hover-lift"
                    style={{
                      padding: '6px 13px',
                      borderRadius: '9999px',
                      border: '1.5px solid #a7f3d0',
                      background: '#ecfdf5',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#047857',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
                    }}
                    title="전체 루틴 목록을 한눈에 확인하고 한번에 수정/삭제/추가합니다"
                  >
                    ⚙️ 루틴 일괄 관리
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddChecklistModal(true)}
                    style={{
                      padding: '6px 13px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(226, 232, 240, 0.9)',
                      background: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#334155',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
                    }}
                  >
                    + 추가
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px 18px', borderRadius: '16px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#0b0f19', marginBottom: '8px' }}>
                  <span>오늘의 달성도</span>
                  <span style={{ color: '#059669', fontWeight: '900' }}>{completionRate}% ({completedCount}/{checklistItems.length})</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${completionRate}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                    borderRadius: '9999px',
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}></div>
                </div>
              </div>

              {/* Checklist Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checklistItems && checklistItems.length > 0 ? (
                  checklistItems.map(item => {
                    const isDone = !!dailyChecklist[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleDailyCheck(item.key)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '14px',
                          border: isDone ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                          background: isDone ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '18px' }}>{isDone ? '✅' : '⚪'}</span>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: '800', color: isDone ? '#047857' : '#0f172a', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: isDone ? '#059669' : '#94a3b8',
                          background: isDone ? '#d1fae5' : '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '9999px'
                        }}>
                          {isDone ? '완료' : '터치하여 체크'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ background: '#fafbfc', borderRadius: '16px', border: '1px dashed #e2e8f0', padding: '24px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>
                      등록된 데일리 케어 루틴이 없습니다.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddChecklistModal(true)}
                        style={{ padding: '6px 14px', borderRadius: '9999px', border: 'none', background: '#10b981', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + 새 루틴 추가
                      </button>
                      <button
                        type="button"
                        onClick={handleResetBulkDraftToDefault}
                        style={{ padding: '6px 14px', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        🔄 기본 루틴 복원
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>
              💡 터치 한 번으로 완료 상태가 브라우저에 실시간 저장됩니다.
            </div>
          </div>

        </div>


        {/* --- ROW 2: 3-COLUMN BENTO GRID (D-Day 일정, AI 질병 진단 소견, 일상 맞춤 AI) --- */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          
          {/* Card 1: ⏰ 케어 일정 & 백신 D-Day */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⏰</span>
                  <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#0b0f19', margin: 0 }}>
                    케어 일정 & D-Day
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(226, 232, 240, 0.9)',
                    background: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#db2777',
                    cursor: 'pointer'
                  }}
                >
                  + 일정 등록
                </button>
              </div>

              {reminders && reminders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {reminders.map(rem => {
                    const dDayText = getDDay(rem.targetDate);
                    const isUrgent = dDayText.includes('D-') && parseInt(dDayText.replace('D-', '')) <= 10;
                    return (
                      <div
                        key={rem.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: rem.completed ? '1px solid #cbd5e1' : isUrgent ? '1.5px solid #fbbf24' : '1px solid #e2e8f0',
                          background: rem.completed ? '#f8fafc' : isUrgent ? '#fffbeb' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{rem.icon || '💊'}</span>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: '800', color: rem.completed ? '#94a3b8' : '#0f172a', textDecoration: rem.completed ? 'line-through' : 'none' }}>
                              {rem.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {rem.targetDate ? rem.targetDate.slice(5) : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: rem.completed ? '#e2e8f0' : isUrgent ? '#fef3c7' : '#ecfdf5',
                            color: rem.completed ? '#64748b' : isUrgent ? '#b45309' : '#047857'
                          }}>
                            {rem.completed ? '완료' : dDayText}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReminderComplete(rem.id)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {rem.completed ? '↩️' : '✔️'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReminder(rem.id);
                            }}
                            style={{
                              border: 'none',
                              background: '#fee2e2',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              color: '#ef4444',
                              padding: '2px 6px',
                              fontWeight: 'bold',
                              marginLeft: '2px'
                            }}
                            title="일정 삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#fafbfc', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '20px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                    등록된 일정이 없습니다
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                    추천 일정을 클릭하여 빠르게 등록해 보세요
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNewReminder({ title: '종합백신 접종', targetDate: '2026-10-15', tag: '백신', icon: '💉' });
                        setShowScheduleModal(true);
                      }}
                      style={{ padding: '4px 10px', borderRadius: '9999px', border: '1px solid #fbcfe8', background: '#fdf2f8', color: '#db2777', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      + 💉 종합백신
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewReminder({ title: '심장사상충 예방약', targetDate: '2026-09-25', tag: '예방약', icon: '💊' });
                        setShowScheduleModal(true);
                      }}
                      style={{ padding: '4px 10px', borderRadius: '9999px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      + 💊 심장사상충
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '12px', textAlign: 'center' }}>
              캘린더 기반 D-Day 알림 연동
            </div>
          </div>

          {/* Card 2: 🩺 최근 AI 질병 진단 리포트 */}
          <div className="card-hover-lift" style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🩺</span>
                  <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#0b0f19', margin: 0 }}>
                    최근 AI 질병 진단 소견
                  </h4>
                </div>
                <span
                  onClick={onNavigateDiagnosis}
                  style={{ fontSize: '11.5px', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
                >
                  스튜디오 ➔
                </span>
              </div>

              {recentDiagnosis ? (
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{recentDiagnosis.date || '최근 진단'}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: recentDiagnosis.danger === 'HIGH' ? '#fee2e2' : '#ecfdf5',
                      color: recentDiagnosis.danger === 'HIGH' ? '#dc2626' : '#059669'
                    }}>
                      {recentDiagnosis.danger === 'HIGH' ? '🚨 정밀 검진 권장' : '✅ 양호'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>
                    {recentDiagnosis.diseaseName || '피부 이상 소견 분석'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                    {recentDiagnosis.opinion || '환부 사진 기반 AI 분석 결과입니다.'}
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fafbfc', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '20px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                    최근 AI 진단 기록 없음
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                    환부 사진을 업로드하여 실시간 질환 확률을 분석해 보세요
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateDiagnosis}
                    className="card-hover-lift"
                    style={{
                      padding: '6px 16px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    사진 업로드 분석 ➔
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '12px', textAlign: 'center' }}>
              Vision AI 멀티모달 진단
            </div>
          </div>

          {/* Card 3: 🤖 일상 맞춤 AI 즉시 브리핑 */}
          <div className="card-hover-lift" style={{
            background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.7) 0%, rgba(240, 253, 250, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '24px',
            border: '1.5px solid #a7f3d0',
            boxShadow: '0 8px 24px -6px rgba(16, 185, 129, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(167, 243, 208, 0.6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🤖</span>
                  <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#065f46', margin: 0 }}>
                    일상 맞춤 AI 어시스턴트
                  </h4>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '9999px' }}>
                  Gemini AI 탑재
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#6b21a8', lineHeight: '1.55', margin: '0 0 16px 0', fontWeight: '500' }}>
                {currentPet?.name || '반려동물'}의 품종과 나이에 맞는 일일 권장 식사량(Kcal) 계산, 이상 행동 분석, 관절/영양제 상담을 실시간으로 시작해 보세요.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('daily-ai')}
                className="card-hover-lift"
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '14px',
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span>
                <span>AI와 일상 케어 상담하기 ➔</span>
              </button>
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
          background: 'rgba(11, 15, 25, 0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 28px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 25px 60px -15px rgba(11, 15, 25, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⏰</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                    케어 일정 & D-Day 등록
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    백신, 정기 검진, 심장사상충 일정을 캘린더에 추가하세요.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReminder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  일정 분류 태그
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
                        padding: '10px 4px',
                        borderRadius: '12px',
                        border: newReminder.tag === item.tag ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        background: newReminder.tag === item.tag ? '#ecfdf5' : '#f8fafc',
                        color: newReminder.tag === item.tag ? '#047857' : '#475569',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{item.icon}</span>
                      <span>{item.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  일정 이름
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 심장사상충 예방약 급여, 1차 정기검진"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  예정일자 (D-Day 기준일)
                </label>
                <input
                  type="date"
                  required
                  value={newReminder.targetDate}
                  onChange={(e) => setNewReminder({ ...newReminder, targetDate: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="card-hover-lift"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
                  }}
                >
                  일정 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ============================================================ */}
      {/* 🚀 MODAL 2: 📈 체중 & 체온 기록 / 수정 전용 팝업 모달 */}
      {/* ============================================================ */}
      {showAddLogModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 15, 25, 0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 28px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 60px -15px rgba(11, 15, 25, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{editingLogIndex !== null ? '✏️' : '📈'}</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                    {editingLogIndex !== null ? '체중 & 체온 측정치 수정' : '체중 & 체온 측정치 기록'}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {editingLogIndex !== null ? '이전 측정 데이터를 정정합니다.' : '반려동물의 새로운 건강 지표를 기록합니다.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddLogModal(false);
                  setEditingLogIndex(null);
                }}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVitalRecord} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  몸무게 (kg)
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  placeholder="예: 3.5"
                  value={newLog.weight}
                  onChange={(e) => setNewLog({ ...newLog, weight: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  체온 (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="예: 38.5"
                  value={newLog.temp}
                  onChange={(e) => setNewLog({ ...newLog, temp: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '4px', display: 'block' }}>💡 정상 체온 범위: 37.5 ~ 39.0°C</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  측정 일자 (선택)
                </label>
                <input
                  type="date"
                  value={newLog.date}
                  onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLogModal(false);
                    setEditingLogIndex(null);
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="card-hover-lift"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
                  }}
                >
                  {editingLogIndex !== null ? '💾 수정 내용 저장' : '📈 차트에 추가'}
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
          background: 'rgba(11, 15, 25, 0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 28px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 60px -15px rgba(11, 15, 25, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                    맞춤 케어 항목 추가
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    매일 실천할 데일리 케어 루틴을 등록하세요.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChecklistModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomCheckItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  케어 항목명
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 🪥 치아 양치질, 🪮 털 빗질"
                  value={newCheckItem.label}
                  onChange={(e) => setNewCheckItem({ ...newCheckItem, label: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  간단한 설명
                </label>
                <input
                  type="text"
                  placeholder="예: 치석 예방 및 잇몸 관리"
                  value={newCheckItem.desc}
                  onChange={(e) => setNewCheckItem({ ...newCheckItem, desc: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddChecklistModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="card-hover-lift"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
                  }}
                >
                  체크리스트에 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🚀 MODAL 3-2: ⚙️ 데일리 케어 루틴 전체 일괄 관리 매니저 모달 */}
      {/* ============================================================ */}
      {showBulkChecklistModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 15, 25, 0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 28px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 60px -15px rgba(11, 15, 25, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⚙️</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                    데일리 케어 루틴 일괄 관리
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    전체 루틴을 한눈에 확인하고 이름/설명 수정, 삭제, 추가를 한번에 저장합니다.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkChecklistModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Bulk Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
              {bulkChecklistDraft.map((item, i) => (
                <div
                  key={item.key || `draft_${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', width: '20px', textAlign: 'center' }}>
                    {i + 1}
                  </span>

                  {/* 항목명 */}
                  <input
                    type="text"
                    required
                    placeholder="루틴 항목명 (예: 수분 섭취)"
                    value={item.label}
                    onChange={(e) => handleUpdateBulkDraftItem(i, 'label', e.target.value)}
                    style={{
                      flex: 1.2,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />

                  {/* 설명 */}
                  <input
                    type="text"
                    placeholder="간단한 설명 (선택)"
                    value={item.desc}
                    onChange={(e) => handleUpdateBulkDraftItem(i, 'desc', e.target.value)}
                    style={{
                      flex: 1.5,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '12.5px',
                      color: '#475569',
                      outline: 'none'
                    }}
                  />

                  {/* 행 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleDeleteBulkDraftRow(i)}
                    style={{
                      border: 'none',
                      background: '#fee2e2',
                      color: '#ef4444',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '800'
                    }}
                    title="이 루틴 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {bulkChecklistDraft.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px' }}>
                  등록된 루틴이 없습니다. 아래의 [+ 새 루틴 행 추가] 또는 [기본 루틴 복원]을 눌러보세요.
                </div>
              )}
            </div>

            {/* Sub actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={handleAddBulkDraftRow}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1px dashed #10b981',
                  background: '#ecfdf5',
                  color: '#059669',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                + 새 루틴 행 추가
              </button>

              <button
                type="button"
                onClick={handleResetBulkDraftToDefault}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🔄 기본 4대 루틴으로 초기화
              </button>
            </div>

            {/* Bottom Form Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowBulkChecklistModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveBulkChecklist}
                className="card-hover-lift"
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
                }}
              >
                💾 전체 수정사항 일괄 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🚀 MODAL 4: 📋 체중 & 체온 전체 기록 일괄 편집 모달 (Bulk Table Editor) */}
      {/* ============================================================ */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 15, 25, 0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 28px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(11, 15, 25, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                    체중 & 체온 전체 일괄 편집
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    과거 및 현재 측정 기록을 표에서 한 번에 수정하거나 추가할 수 있습니다.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Table Area */}
            <form onSubmit={handleSaveBulkRecords} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px', color: '#475569', fontWeight: '800', width: '34%' }}>측정 일자</th>
                      <th style={{ padding: '10px 8px', color: '#059669', fontWeight: '800', width: '28%' }}>몸무게 (kg)</th>
                      <th style={{ padding: '10px 8px', color: '#f59e0b', fontWeight: '800', width: '28%' }}>체온 (°C)</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontWeight: '800', width: '10%', textAlign: 'center' }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRecords && bulkRecords.length > 0 ? (
                      bulkRecords.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 6px' }}>
                            <input
                              type="text"
                              required
                              value={row.date}
                              onChange={(e) => handleUpdateBulkRow(idx, 'date', e.target.value)}
                              placeholder="09/03"
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                outline: 'none',
                                background: '#f8fafc',
                                boxSizing: 'border-box'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <input
                              type="number"
                              step="0.05"
                              value={row.weight}
                              onChange={(e) => handleUpdateBulkRow(idx, 'weight', e.target.value)}
                              placeholder="예: 3.8"
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                outline: 'none',
                                background: '#f8fafc',
                                boxSizing: 'border-box',
                                fontWeight: '700',
                                color: '#059669'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <input
                              type="number"
                              step="0.1"
                              value={row.temp}
                              onChange={(e) => handleUpdateBulkRow(idx, 'temp', e.target.value)}
                              placeholder="예: 38.5"
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                outline: 'none',
                                background: '#f8fafc',
                                boxSizing: 'border-box',
                                fontWeight: '700',
                                color: '#f59e0b'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteBulkRow(idx)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#e11d48',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px'
                              }}
                              title="이 행 삭제"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                          측정 기록이 없습니다. 아래 버튼으로 행을 추가하세요.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Add Row Button */}
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleAddBulkRow}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      color: '#047857',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    + 새 측정치 행 추가하기
                  </button>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="card-hover-lift"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
                  }}
                >
                  💾 전체 변경사항 저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




    </section>
  );
}




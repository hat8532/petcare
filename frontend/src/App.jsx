import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import DiagnosisDropzone from './components/DiagnosisDropzone';
import PetHealthDashboard from './components/PetHealthDashboard';
import DailyCareChatbot from './components/DailyCareChatbot';
import CareFlowBranch from './components/CareFlowBranch';
import TimelineSlider from './components/TimelineSlider';
import HospitalLocator from './components/HospitalLocator';
import NewsSection from './components/NewsSection';
import CommunitySection from './components/CommunitySection';
import CommunityPostDetail from './components/CommunityPostDetail';
import LoginPage from './components/LoginPage';
import OAuth2CallbackPage from './components/OAuth2CallbackPage';
import PetEditModal from './components/PetEditModal';
import MyPage from './components/MyPage';
import Footer from './components/Footer';


import { petApi } from './api/petApi';
import { authApi } from './api/authApi';
import { AUTH_EXPIRED_EVENT } from './api/common/httpClient';

const OFFICIAL_HOSPITAL_SEARCH_URL = 'https://map.naver.com/p/search/24시%20동물병원';

export default function App() {
  // 커뮤니티 목록에서 "글 상세보기"를 누르면 그 글 번호를 여기에 담고
  // activeTab 을 'community-detail' 로 바꿔 상세 화면을 띄운다.
  const [selectedPostId, setSelectedPostId] = useState(null);

  const [activeTab, setActiveTab] = useState(() => {
    if (window.location.pathname.startsWith('/login') || window.location.search.includes('error=')) {
      return 'login';
    }
    return 'home';
  });
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [latestDiagnosis, setLatestDiagnosis] = useState(null);
  const [careFlowLookupRequest, setCareFlowLookupRequest] = useState(0);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('petcare_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Check if current URL is OAuth2 callback
  const [isOAuth2Callback, setIsOAuth2Callback] = useState(() => 
    window.location.pathname.startsWith('/oauth2/callback')
  );

  // Real backend API integration: Fetch Pets on mount and whenever user changes
  useEffect(() => {
    if (isOAuth2Callback) return;
    if (!user || !user.id) {
      setPets([]);
      setSelectedPet(null);
      return;
    }
    let active = true;
    async function loadPets() {
      const data = await petApi.getPetsByUser(user.id);
      // 로그아웃·계정 변경으로 끝난 조회의 응답은 현재 Pet 상태에 적용하지 않는다.
      if (!active) return;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0]);
      } else {
        setSelectedPet(null);
      }
    }
    loadPets();
    return () => { active = false; };
  }, [user, isOAuth2Callback]);

  useEffect(() => {
    setLatestDiagnosis(null);
  }, [selectedPet?.id]);

  // Handle auth session expiration (e.g. refresh token failure)
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setPets([]);
      setSelectedPet(null);
      setEditingPet(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  const handlePetAdded = (newPet) => {
    setPets((prev) => [...prev, newPet]);
    setSelectedPet(newPet);
  };

  const handlePetUpdated = (updatedPet) => {
    setPets((prev) => prev.map(p => p.id === updatedPet.id ? { ...p, ...updatedPet } : p));
    if (selectedPet?.id === updatedPet.id) {
      setSelectedPet(prev => ({ ...prev, ...updatedPet }));
    }
  };

  const handlePetDeleted = (deletedPetId) => {
    setPets((prev) => {
      const filtered = prev.filter(p => p.id !== deletedPetId);
      if (selectedPet?.id === deletedPetId) {
        setSelectedPet(filtered[0] || null);
      }
      return filtered;
    });
  };

  const handleOpenDiagnosisCareFlow = (diagnosisResult) => {
    if (diagnosisResult) setLatestDiagnosis(diagnosisResult);
    setCareFlowLookupRequest((current) => current + 1);
    window.requestAnimationFrame(() => {
      document.getElementById('diagnosis-care-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleNavigateTimeline = (diagnosisResult) => {
    if (diagnosisResult) setLatestDiagnosis(diagnosisResult);
    setActiveTab('timeline');
  };

  // Render content dynamically based on selected Category Tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <PetHealthDashboard
            user={user}
            selectedPet={selectedPet}
            setSelectedPet={setSelectedPet}
            pets={pets}
            onOpenLogin={() => setActiveTab('login')}
            onNavigateDiagnosis={() => setActiveTab('diagnosis')}
            onOpenEditPet={(petToEdit) => setEditingPet(petToEdit)}
          />
        );



      case 'daily-ai':
        return (
          <DailyCareChatbot
            selectedPet={selectedPet}
          />
        );

      case 'diagnosis':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '9999px' }}>
                Core Feature
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
                AI 반려동물 질병 진단 스튜디오
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                환부 Image 소견과 입력 기반 Safety Triage 결과를 구분해 안내합니다.
              </p>
            </div>
            <DiagnosisDropzone
              key={selectedPet?.id || 'no-pet'}
              selectedPet={selectedPet}
              pets={pets}
              isAuthenticated={Boolean(user)}
              onSelectPet={setSelectedPet}
              onOpenLogin={() => setActiveTab('login')}
              onOpenPetManagement={() => setActiveTab('dashboard')}
              onNavigateTimeline={handleNavigateTimeline}
              onOpenCareFlow={handleOpenDiagnosisCareFlow}
              onDiagnosisResult={setLatestDiagnosis}
            />
            <div style={{ marginTop: '40px' }}>
              <CareFlowBranch
                diagnosisResult={latestDiagnosis}
                onNavigateTimeline={handleNavigateTimeline}
                lookupRequestId={careFlowLookupRequest}
              />
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                Before / After 경과 관찰 타임라인
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                저장된 실제 진단 두 건이 준비되면 같은 환부의 변화를 비교할 수 있습니다.
              </p>
            </div>
            <TimelineSlider
              selectedPet={selectedPet}
              sourceDiagnosis={latestDiagnosis}
              onNavigateDiagnosis={() => setActiveTab('diagnosis')}
            />
          </div>
        );

      case 'hospitals':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                24시 응급 동물병원 찾기
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                네이버 지역검색으로 확인된 병원만 표시합니다. 이동 전 병원에 전화해 진료 가능 여부를 확인하세요.
              </p>
            </div>
            <HospitalLocator
              user={user}
              onOpenLogin={() => setActiveTab('login')}
            />
          </div>
        );

      case 'news':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                실시간 펫 헬스 케어 뉴스
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                수의학 건강 상식, 사료 리콜 정보, 안구/피부 케어 가이드
              </p>
            </div>
            <NewsSection />
          </div>
        );

      case 'community':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                반려인 커뮤니티 & 리포트 공유
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                AI 진단 리포트를 첨부하고 다른 반려인들과 경험을 나누어 보세요.
              </p>
            </div>
            <CommunitySection
              user={user}
              onOpenLogin={() => setActiveTab('login')}
              onOpenDetail={(postId) => {
                setSelectedPostId(postId);
                setActiveTab('community-detail');
              }}
            />
          </div>
        );

      case 'community-detail':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <CommunityPostDetail
              postId={selectedPostId}
              onBack={() => setActiveTab('community')}
              user={user}
              onOpenLogin={() => setActiveTab('login')}
            />
          </div>
        );

      case 'login':
        return (
          <LoginPage
            isOpen={true}
            isEmbeddedPage={true}
            onLoginSuccess={(loggedInUser) => {
              setUser(loggedInUser);
              setActiveTab('home');
            }}
          />
        );

      case 'mypage':

        return (
          <MyPage
            user={user}
            pets={pets}
            onUserUpdated={(updatedUser) => setUser(updatedUser)}
            onLogout={async () => {
              if (!await authApi.logout()) return;
              setUser(null);
              setActiveTab('home');
            }}
            onWithdraw={async () => {
              if (window.confirm('정말로 탈퇴하시겠습니까? 탈퇴 후 기존 정보는 안전하게 보존되지만 로그인이 제한됩니다.')) {
                try {
                  await authApi.withdraw();
                  setUser(null);
                  setActiveTab('home');
                  alert('회원 탈퇴 처리가 완료되었습니다.');
                } catch (e) {
                  alert(e.message || '탈퇴 처리에 실패했습니다.');
                }
              }
            }}
            onNavigateHome={() => setActiveTab('home')}
          />
        );

      case 'home':
      default:



        return (
          <>
            {/* Unified Hero Section */}
            <HeroSection
              onStartDiagnosis={() => setActiveTab('diagnosis')}
              onNavigateDashboard={() => setActiveTab('dashboard')}
              onFindHospital={() => setActiveTab('hospitals')}
            />

            {/* 1. Toss / Apple Style 4 Core Service Cards - Arranged in a clean Single Row */}
            <div className="container" style={{ padding: '70px 20px 80px 20px', maxWidth: '1240px' }}>
              <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: '800',
                  color: '#047857',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  letterSpacing: '0.5px'
                }}>
                  CORE SERVICES
                </span>
                <h2 style={{ fontSize: '34px', fontWeight: '900', color: '#0b0f19', marginTop: '12px', letterSpacing: '-1px' }}>
                  스마트 헬스케어 주요 기능
                </h2>
                <p style={{ fontSize: '15.5px', color: '#64748b', marginTop: '8px', fontWeight: '500' }}>
                  원하시는 서비스를 선택하여 반려동물 맞춤 헬스케어를 경험해 보세요.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px'
              }}>
                
                {/* Feature 1: AI 질병 진단 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnosis')}
                  className="card-hover-lift"
                  style={{
                    background: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '26px',
                    padding: '30px 22px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px'
                  }}
                >
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                      color: '#10b981',
                      fontSize: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '18px',
                      border: '1px solid #a7f3d0',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                    }}>
                      🩺
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                      AI 질병 진단 스튜디오
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0, fontWeight: '500' }}>
                      환부 사진과 증상 입력 시 Vision AI 정밀 분류 및 수의학 맞춤 소견 발급
                    </p>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669', marginTop: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>진단 시작하기</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Feature 2: 건강 대시보드 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="card-hover-lift"
                  style={{
                    background: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '26px',
                    padding: '30px 22px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px'
                  }}
                >
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                      color: '#2563eb',
                      fontSize: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '18px',
                      border: '1px solid #bfdbfe',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                    }}>
                      📊
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                      건강 관리 대시보드
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0, fontWeight: '500' }}>
                      기초 바이탈, 1초 데일리 케어 루틴, 체중/체온 변화 추이 및 백신 D-Day 알림
                    </p>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb', marginTop: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>대시보드 열기</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Feature 3: 경과 관찰 타임라인 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="card-hover-lift"
                  style={{
                    background: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '26px',
                    padding: '30px 22px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px'
                  }}
                >
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)',
                      color: '#7c3aed',
                      fontSize: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '18px',
                      border: '1px solid #ddd6fe',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)'
                    }}>
                      🔍
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                      경과 관찰 타임라인
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0, fontWeight: '500' }}>
                      동일 환부를 3일 뒤 대조 촬영하여 Before/After 슬라이더로 증상 호전도 추적
                    </p>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed', marginTop: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>타임라인 확인</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Feature 4: 24시 응급 병원 찾기 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('hospitals')}
                  className="card-hover-lift"
                  style={{
                    background: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '26px',
                    padding: '30px 22px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px'
                  }}
                >
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%)',
                      color: '#e11d48',
                      fontSize: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '18px',
                      border: '1px solid #fecdd3',
                      boxShadow: '0 4px 12px rgba(225, 29, 72, 0.15)'
                    }}>
                      🚨
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                      24시 응급 병원 찾기
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0, fontWeight: '500' }}>
                      현재 GPS 기준 가장 가까운 야간 응급 동물병원 실시간 거리순 매칭 및 바로 전화
                    </p>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#e11d48', marginTop: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>응급실 찾기</span>
                    <span>→</span>
                  </div>
                </button>

              </div>
            </div>


            {/* 2. 3-Step Simple Guide (Apple / Toss Style) */}
            <div style={{ background: '#fbfcfd', padding: '70px 20px 76px 20px', borderTop: '1px solid rgba(226, 232, 240, 0.7)', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
              <div className="container" style={{ maxWidth: '1060px', textAlign: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '4px 14px', borderRadius: '9999px', letterSpacing: '0.5px' }}>
                  HOW IT WORKS
                </span>
                <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0b0f19', marginTop: '12px', letterSpacing: '-0.8px' }}>
                  간편한 3단계 스마트 케어 프로세스
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '22px', marginTop: '40px', textAlign: 'left' }}>
                  <div className="card-hover-lift" style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    padding: '28px 24px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '10px'
                    }}>
                      STEP 01
                    </div>
                    <h4 style={{ fontSize: '17px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px' }}>환부 사진 촬영 & 업로드</h4>
                    <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                      피부나 안구 등 이상 증상이 의심되는 부위를 촬영하여 간편하게 등록합니다.
                    </p>
                  </div>

                  <div className="card-hover-lift" style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    padding: '28px 24px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '10px'
                    }}>
                      STEP 02
                    </div>
                    <h4 style={{ fontSize: '17px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px' }}>AI 수의학 정밀 판독</h4>
                    <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                      Vision AI와 Gemini RAG가 실시간 임상 소견 및 위험도 가이드를 발급합니다.
                    </p>
                  </div>

                  <div className="card-hover-lift" style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    padding: '28px 24px',
                    border: '1px solid rgba(226, 232, 240, 0.85)',
                    boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '10px'
                    }}>
                      STEP 03
                    </div>
                    <h4 style={{ fontSize: '17px', fontWeight: '900', color: '#0b0f19', marginBottom: '8px' }}>대시보드 & 응급 연계</h4>
                    <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                      데일리 체크리스트로 일상을 기록하고 필요 시 가까운 24시 응급실로 연결합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Bottom Clean Apple Dark CTA Banner */}
            <div className="container" style={{ padding: '70px 20px 90px 20px', maxWidth: '1060px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0b0f19 0%, #1e293b 100%)',
                borderRadius: '32px',
                padding: '56px 36px',
                color: '#ffffff',
                textAlign: 'center',
                boxShadow: '0 20px 50px -15px rgba(11, 15, 25, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-50px',
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
                  filter: 'blur(50px)',
                  pointerEvents: 'none'
                }} />

                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 12px 0', letterSpacing: '-0.8px' }}>
                  지금 반려동물 맞춤 헬스케어를 시작하세요
                </h2>
                <p style={{ fontSize: '15.5px', color: '#94a3b8', maxWidth: '560px', margin: '0 auto 32px auto', lineHeight: '1.65', fontWeight: '500' }}>
                  사진 한 장으로 간편하게 시작하는 AI 질병 분석과 스마트 바이탈 기록
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnosis')}
                  className="card-hover-lift"
                  style={{
                    padding: '14px 34px',
                    borderRadius: '9999px',
                    background: '#ffffff',
                    color: '#0b0f19',
                    fontSize: '15px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  🩺 AI 질병 진단 시작하기
                </button>
              </div>
            </div>

          </>
        );
    }
  };

  if (isOAuth2Callback) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <OAuth2CallbackPage onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setIsOAuth2Callback(false);
          setActiveTab('home');
        }} />
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Top Unified Navbar */}
      <Navbar
        user={user}
        onUserChange={setUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        selectedPet={selectedPet}
        setSelectedPet={setSelectedPet}
        pets={pets}
        onPetAdded={handlePetAdded}
        onOpenEditPet={(petToEdit) => setEditingPet(petToEdit)}
      />

      {/* Main Dynamic Content */}
      <main style={{ flex: 1, marginTop: '8px' }}>
        {renderTabContent()}
      </main>


      {/* Pet Edit Modal */}
      <PetEditModal
        isOpen={!!editingPet}
        onClose={() => setEditingPet(null)}
        pet={editingPet}
        onPetUpdated={handlePetUpdated}
        onPetDeleted={handlePetDeleted}
      />

      {/* Footer */}
      <Footer />



    </div>
  );
}

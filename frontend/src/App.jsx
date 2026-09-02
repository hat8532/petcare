import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import DiagnosisDropzone from './components/DiagnosisDropzone';
import PetHealthDashboard from './components/PetHealthDashboard';
import DailyCareChatbot from './components/DailyCareChatbot';
import CareFlowBranch from './components/CareFlowBranch';
import TimelineSlider from './components/TimelineSlider';
import NewsSection from './components/NewsSection';
import CommunitySection from './components/CommunitySection';
import LoginPage from './components/LoginPage';
import OAuth2CallbackPage from './components/OAuth2CallbackPage';
import PetEditModal from './components/PetEditModal';
import Footer from './components/Footer';
import { petApi } from './api/petApi';

const OFFICIAL_HOSPITAL_SEARCH_URL = 'https://map.naver.com/p/search/24시%20동물병원';

export default function App() {
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
    async function loadPets() {
      const data = await petApi.getPetsByUser(user.id);
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0]);
      } else {
        setSelectedPet(null);
      }
    }
    loadPets();
  }, [user, isOAuth2Callback]);

  useEffect(() => {
    setLatestDiagnosis(null);
  }, [selectedPet?.id]);

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
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#e11d48', background: '#fff1f2', border: '1px solid #fecdd3', padding: '4px 12px', borderRadius: '9999px' }}>
                VERIFIED SOURCE REQUIRED
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
                24시 응급 동물병원 검색 안내
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                저장소의 출처 검증 전 seed 병원 정보는 이 화면에 노출하지 않습니다. 공식 지도와 병원 전화로 실제 운영 여부를 확인하세요.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
              <h3 style={{ marginTop: 0 }}>검증된 병원 Data Source 연결 전입니다.</h3>
              <p style={{ color: '#475569', lineHeight: 1.7 }}>
                고정 좌표나 생성한 병원명·전화번호는 실제 응급 정보로 표시하지 않습니다.
                현재는 공식 지도에서 병원 운영 여부와 연락처를 직접 확인해 주세요.
              </p>
              <a
                href={OFFICIAL_HOSPITAL_SEARCH_URL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                공식 지도에서 24시 동물병원 검색
              </a>
            </div>
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
            <CommunitySection />
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

            {/* 1. Toss / Apple Style 4 Core Service Cards */}
            <div className="container" style={{ padding: '60px 20px 70px 20px', maxWidth: '1040px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 14px', borderRadius: '9999px' }}>
                  CORE FEATURES
                </span>
                <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px', letterSpacing: '-0.5px' }}>
                  스마트 헬스케어 주요 기능
                </h2>
                <p style={{ fontSize: '15px', color: '#64748b', marginTop: '6px' }}>
                  원하시는 기능을 선택하여 우리 아이 맞춤 헬스케어를 경험해 보세요.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                
                {/* Feature 1 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnosis')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '32px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  className="harmonious-card"
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#ecfdf5', color: '#059669', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid #a7f3d0' }}>
                      🩺
                    </div>
                    <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                      AI 질병 진단 스튜디오
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                      환부 사진과 증상 입력 시 Vision AI 분류 및 Gemini RAG 수의학 맞춤 소견 발급
                    </p>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#059669', marginTop: '20px' }}>
                    진단 시작하기 ➔
                  </div>
                </button>

                {/* Feature 2 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '32px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  className="harmonious-card"
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eff6ff', color: '#2563eb', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid #bfdbfe' }}>
                      📊
                    </div>
                    <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                      건강 관리 대시보드
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                      기초 바이탈, 1초 데일리 케어 루틴, 체중/체온 변화 추이 및 백신 D-Day 알림
                    </p>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#2563eb', marginTop: '20px' }}>
                    대시보드 열기 ➔
                  </div>
                </button>

                {/* Feature 3 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '32px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  className="harmonious-card"
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#f5f3ff', color: '#7c3aed', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid #ddd6fe' }}>
                      🔍
                    </div>
                    <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                      경과 관찰 타임라인
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                      동일 환부를 3일 뒤 대조 촬영하여 Before/After 슬라이더로 증상 호전도 추적
                    </p>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#7c3aed', marginTop: '20px' }}>
                    타임라인 확인 ➔
                  </div>
                </button>

                {/* Feature 4 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('hospitals')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '32px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  className="harmonious-card"
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fff1f2', color: '#e11d48', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid #fecdd3' }}>
                      🏥
                    </div>
                    <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                      24시 응급 동물병원
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                      내 위치 기반 최단 거리 계산으로 야간 및 응급 진료 가능한 동물병원 실시간 안내
                    </p>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#e11d48', marginTop: '20px' }}>
                    응급실 찾기 ➔
                  </div>
                </button>

              </div>
            </div>

            {/* 2. 3-Step Simple Guide (Toss Style) */}
            <div style={{ background: '#f8fafc', padding: '60px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
              <div className="container" style={{ maxWidth: '1040px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '9999px' }}>
                  HOW IT WORKS
                </span>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginTop: '10px', letterSpacing: '-0.5px' }}>
                  간편한 3단계 건강 케어 프로세스
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '36px', textAlign: 'left' }}>
                  <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginBottom: '8px' }}>01</div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>환부 사진 촬영 & 업로드</h4>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                      피부나 안구 등 이상 증상이 의심되는 부위를 촬영하여 간편하게 등록합니다.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginBottom: '8px' }}>02</div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>AI 수의학 맞춤 분석</h4>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                      Vision AI와 Gemini RAG가 실시간 임상 소견 및 위험도 가이드를 발급합니다.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginBottom: '8px' }}>03</div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>대시보드 & 응급 연계</h4>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                      데일리 체크리스트로 일상을 기록하고 필요 시 가까운 24시 응급실로 연결합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Bottom Clean CTA Banner */}
            <div className="container" style={{ padding: '60px 20px 80px 20px', maxWidth: '1040px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: '28px',
                padding: '48px 32px',
                color: '#ffffff',
                textAlign: 'center',
                boxShadow: '0 12px 35px rgba(5, 150, 105, 0.2)'
              }}>
                <h2 style={{ fontSize: '30px', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
                  지금 우리 아이 맞춤 헬스케어를 시작하세요
                </h2>
                <p style={{ fontSize: '15px', color: '#d1fae5', maxWidth: '560px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
                  사진 한 장으로 간편하게 시작하는 AI 질병 분석과 스마트 건강 기록
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnosis')}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    color: '#047857',
                    fontSize: '15px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
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
      <main style={{ flex: 1 }}>
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

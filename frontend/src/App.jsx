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

            {/* Unified Harmonious Category Feature Cards Hub */}
            <div className="container" style={{ padding: '60px 20px 80px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '9999px' }}>
                  FEATURED SERVICES
                </span>
                <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
                  PetCare AI 핵심 서비스
                </h2>
                <p style={{ fontSize: '15px', color: '#64748b', marginTop: '6px' }}>
                  원하시는 서비스를 선택하여 우리 아이 맞춤 헬스 케어를 경험해 보세요.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                {/* Feature 1 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnosis')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px', width: '100%', font: 'inherit' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', color: '#059669', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #a7f3d0', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.12)' }}>
                    🩺
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    AI 질병 진단 스튜디오
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    환부 사진·증상으로 Safety Triage를 안내하고, 검증된 Provider 응답이 있을 때만 AI 의심 소견을 표시
                  </p>
                </button>

                {/* Feature 2 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px', width: '100%', font: 'inherit' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #bfdbfe', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.12)' }}>
                    📊
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    경과 관찰 타임라인
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    실제 진단 두 건의 비교 Contract가 연결되기 전에는 준비 상태만 안내
                  </p>
                </button>

                {/* Feature 3 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('hospitals')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px', width: '100%', font: 'inherit' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', color: '#e11d48', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #fecdd3', boxShadow: '0 8px 20px rgba(225, 29, 72, 0.12)' }}>
                    🏥
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    공식 병원 검색 안내
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    검증된 병원 Source 연결 전에는 생성 연락처 대신 공식 지도 검색만 제공
                  </p>
                </button>

                {/* Feature 4 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('community')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px', width: '100%', font: 'inherit' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: '#9333ea', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #e9d5ff', boxShadow: '0 8px 20px rgba(147, 51, 234, 0.12)' }}>
                    💬
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    반려인 커뮤니티
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    진단 기록을 참고해 다른 반려인들과 경험과 관리 메모를 공유
                  </p>
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

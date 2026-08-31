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
import LoginPage from './components/LoginPage';
import OAuth2CallbackPage from './components/OAuth2CallbackPage';
import PetEditModal from './components/PetEditModal';
import Footer from './components/Footer';
import { petApi } from './api/petApi';

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
              onNavigateTimeline={() => setActiveTab('timeline')}
              onNavigateHospital={() => setActiveTab('hospitals')}
              onDiagnosisResult={setLatestDiagnosis}
            />
            <div style={{ marginTop: '40px' }}>
              <CareFlowBranch
                diagnosisResult={latestDiagnosis}
                onNavigateTimeline={() => setActiveTab('timeline')}
                onNavigateHospital={() => setActiveTab('hospitals')}
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
                동일 환부의 날짜별 변화를 대조하고 AI 호전도 판정을 확인하세요.
              </p>
            </div>
            <TimelineSlider selectedPet={selectedPet} />
          </div>
        );

      case 'hospitals':
        return (
          <div className="container" style={{ padding: '40px 20px 60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#e11d48', background: '#fff1f2', border: '1px solid #fecdd3', padding: '4px 12px', borderRadius: '9999px' }}>
                24 Hours Emergency
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
                전국 24시 응급 동물병원 찾기
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
                Haversine 공간 거리 계산을 거쳐 현재 위치에서 가장 가까운 병원을 안내합니다.
              </p>
            </div>
            <HospitalLocator />
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
                <div 
                  onClick={() => setActiveTab('diagnosis')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', color: '#059669', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #a7f3d0', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.12)' }}>
                    🩺
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    AI 질병 진단 스튜디오
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    환부 사진과 증상 입력 시 Vision AI 분류 및 Gemini RAG 수의학 맞춤 리포트 즉시 발급
                  </p>
                </div>

                {/* Feature 2 */}
                <div 
                  onClick={() => setActiveTab('timeline')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #bfdbfe', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.12)' }}>
                    📊
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    경과 관찰 타임라인
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    3일 뒤 동일 환부를 찍어 대조 슬라이더 비교 및 AI 호전도 자동 판정
                  </p>
                </div>

                {/* Feature 3 */}
                <div 
                  onClick={() => setActiveTab('hospitals')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', color: '#e11d48', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #fecdd3', boxShadow: '0 8px 20px rgba(225, 29, 72, 0.12)' }}>
                    🏥
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    24시 응급 동물병원
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    내 위치 기반 거리 계산(Haversine)을 거쳐 24시 응급 동물병원 즉시 전화 연결
                  </p>
                </div>

                {/* Feature 4 */}
                <div 
                  onClick={() => setActiveTab('community')}
                  className="harmonious-card"
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px' }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: '#9333ea', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #e9d5ff', boxShadow: '0 8px 20px rgba(147, 51, 234, 0.12)' }}>
                    💬
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    반려인 커뮤니티
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    AI 진단 리포트를 첨부하고 전문 수의사 및 다른 반려인들과 조언 공유
                  </p>
                </div>
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

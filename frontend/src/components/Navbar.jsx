import React, { useState } from 'react';
import LoginPage from './LoginPage';
import PetRegisterModal from './PetRegisterModal';

export default function Navbar({ activeTab, setActiveTab, selectedPet, setSelectedPet, pets, onPetAdded, onOpenEditPet }) {
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPetRegisterModal, setShowPetRegisterModal] = useState(false);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('petcare_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('petcare_token');
    localStorage.removeItem('petcare_user');
    setUser(null);
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 0',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('home')} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}>
              🐾
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.03em' }}>
                PetCare<span style={{ color: '#059669' }}>AI</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { id: 'home', label: '홈' },
              { id: 'diagnosis', label: 'AI 질병 진단', isCore: true },
              { id: 'news', label: '반려동물 뉴스' },
              { id: 'community', label: '반려인 커뮤니티' },
              { id: 'hospitals', label: '24시 응급 병원' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: activeTab === item.id ? '#ecfdf5' : 'transparent',
                  color: activeTab === item.id ? '#047857' : '#475569',
                  border: activeTab === item.id ? '1px solid #a7f3d0' : '1px solid transparent',
                  padding: '8px 15px',
                  borderRadius: '9999px',
                  fontSize: '13.5px',
                  fontWeight: activeTab === item.id ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label}
                {item.isCore && <span style={{ fontSize: '10px', background: '#059669', color: '#ffffff', padding: '2px 6px', borderRadius: '9999px', fontWeight: '800' }}>Core</span>}
              </button>
            ))}
          </nav>

          {/* Upper Right Action Group: Dashboard & Pet Selector & Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Prominent Upper Right Dashboard Button */}
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                background: activeTab === 'dashboard' ? '#059669' : '#eef2ff',
                color: activeTab === 'dashboard' ? '#ffffff' : '#4f46e5',
                border: activeTab === 'dashboard' ? '1px solid #047857' : '1px solid #c7d2fe',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'dashboard' ? '0 4px 12px rgba(5, 150, 105, 0.25)' : '0 2px 8px rgba(79, 70, 229, 0.08)',
                whiteSpace: 'nowrap'
              }}
            >
              <span>📊</span>
              <span>스마트 대시보드</span>
            </button>
            {/* Pet Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!user && pets.length === 0) {
                    alert('🔒 반려동물 등록은 로그인 후 이용하실 수 있습니다.');
                    setShowLoginModal(true);
                    return;
                  }
                  setShowPetDropdown(!showPetDropdown);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  background: selectedPet ? '#ffffff' : '#ecfdf5',
                  border: selectedPet ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: selectedPet ? '#0f172a' : '#047857',
                  boxShadow: 'var(--shadow-subtle)',
                  whiteSpace: 'nowrap',
                  fontWeight: '700'
                }}
              >
                <span style={{ fontSize: '18px' }}>{selectedPet?.icon || '🐾'}</span>
                <span>{selectedPet ? selectedPet.name : '반려동물 등록'}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>▼</span>
              </button>

              {showPetDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  width: '230px',
                  padding: '10px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  zIndex: 200,
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.1)',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 6px', fontWeight: '700' }}>
                    나의 반려동물 목록 ({pets.length}마리)
                  </div>

                  {pets.length === 0 ? (
                    <div style={{ padding: '12px 6px', textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
                      등록된 반려동물이 없습니다.
                    </div>
                  ) : (
                    pets.map((pet) => (
                      <div
                        key={pet.id}
                        onClick={() => {
                          setSelectedPet(pet);
                          setShowPetDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: selectedPet?.id === pet.id ? '#ecfdf5' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '22px' }}>{pet.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{pet.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{pet.breed} ({pet.age})</div>
                        </div>
                        {onOpenEditPet && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPet(pet);
                              setShowPetDropdown(false);
                              onOpenEditPet(pet);
                            }}
                            title="정보 수정"
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '3px 7px',
                              fontSize: '11.5px',
                              cursor: 'pointer',
                              color: '#475569'
                            }}
                          >
                            ✏️ 수정
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  <div 
                    onClick={() => {
                      setShowPetDropdown(false);
                      if (!user) {
                        alert('🔒 반려동물 등록은 로그인 후 이용하실 수 있습니다.');
                        setShowLoginModal(true);
                        return;
                      }
                      setShowPetRegisterModal(true);
                    }}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      marginTop: '6px',
                      paddingTop: '8px',
                      textAlign: 'center',
                      fontSize: '12.5px',
                      color: '#059669',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    + {pets.length === 0 ? '첫 반려동물 등록하기' : '반려동물 추가 등록'}
                  </div>
                </div>
              )}
            </div>

            {/* Login Status */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  👋 {user.nickname}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="btn-emerald-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <LoginPage
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          if (pets.length === 0) {
            setShowPetRegisterModal(true);
          }
        }}
      />

      <PetRegisterModal
        isOpen={showPetRegisterModal}
        onClose={() => setShowPetRegisterModal(false)}
        onPetCreated={(newPet) => {
          if (onPetAdded) onPetAdded(newPet);
          setSelectedPet(newPet);
        }}
      />
    </>
  );
}

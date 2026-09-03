import React, { useState } from 'react';
import LoginPage from './LoginPage';
import PetRegisterModal from './PetRegisterModal';
import { authApi } from '../api/authApi';

export default function Navbar({
  user,
  onUserChange,
  activeTab,
  setActiveTab,
  selectedPet,
  setSelectedPet,
  pets,
  onPetAdded,
  onOpenEditPet,
  onOpenMyPage
}) {
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPetRegisterModal, setShowPetRegisterModal] = useState(false);

  const handleLogout = async () => {
    await authApi.logout();
    if (onUserChange) onUserChange(null);
  };


  return (
    <>
      <header className="site-navbar" style={{
        position: 'sticky',
        top: '16px',
        zIndex: 100,
        margin: '0 auto',
        width: 'calc(100% - 32px)',
        maxWidth: '1280px',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(30px) saturate(190%)',
        WebkitBackdropFilter: 'blur(30px) saturate(190%)',
        borderRadius: '9999px',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.09), 0 0 0 1px rgba(226, 232, 240, 0.6)',
        padding: '9px 18px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', width: '100%' }}>
          
          {/* 1. Brand Logo */}
          <div
            className="site-navbar__brand"
            onClick={() => setActiveTab('home')} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', paddingLeft: '4px' }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '19px',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.32)'
            }}>
              🐾
            </div>
            <div>
              <span style={{ fontSize: '19.5px', fontWeight: '900', color: '#0b0f19', letterSpacing: '-0.04em' }}>
                PetCare<span style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginLeft: '2px'
                }}>AI</span>
              </span>
            </div>
          </div>

          {/* 2. Apple Segmented Pill Track (Center) */}
          <nav className="site-navbar__links" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(241, 245, 249, 0.75)',
            padding: '4px 6px',
            borderRadius: '9999px',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            {[
              { id: 'home', label: '홈', icon: '🏠' },
              { id: 'dashboard', label: '건강 대시보드', icon: '📊' },
              { id: 'diagnosis', label: 'AI 진단', icon: '🩺', isCore: true },
              { id: 'news', label: '뉴스', icon: '📰' },
              { id: 'community', label: '커뮤니티', icon: '💬' },
              { id: 'hospitals', label: '24시 응급', icon: '🚨' },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0b0f19' : '#64748b',
                    border: isActive ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid transparent',
                    padding: '7px 15px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: isActive ? '800' : '600',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.06)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.isCore && (
                    <span style={{
                      fontSize: '9px',
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      fontWeight: '900',
                      letterSpacing: '0.2px'
                    }}>
                      Core
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 3. Action Group: Pet Selector & Auth */}
          <div className="site-navbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '4px' }}>
            
            {/* Pet Dropdown Pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!user) {
                    alert('🔒 반려동물 등록은 로그인 후 이용하실 수 있습니다.');
                    if (setActiveTab) setActiveTab('login');
                    setShowLoginModal(true);
                    return;
                  }
                  setShowPetDropdown(!showPetDropdown);
                }}
                className="card-hover-lift"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 13px',
                  borderRadius: '9999px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  color: '#0b0f19',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  whiteSpace: 'nowrap',
                  fontWeight: '700'
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px' }}>{selectedPet?.icon || '🐾'}</span>
                  {selectedPet && (
                    <span style={{
                      position: 'absolute',
                      bottom: '-1px',
                      right: '-3px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#10b981',
                      border: '1.5px solid #ffffff'
                    }} />
                  )}
                </div>
                <span>{selectedPet ? selectedPet.name : '펫 등록'}</span>
                <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>▼</span>
              </button>

              {showPetDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '240px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(24px)',
                  borderRadius: '20px',
                  zIndex: 200,
                  boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.15)',
                  border: '1px solid rgba(226, 232, 240, 0.9)'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#64748b',
                    padding: '4px 8px 8px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    내 반려동물 목록
                  </div>

                    {pets.length === 0 ? (
                      <div style={{ padding: '12px 8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        등록된 반려동물이 없습니다
                      </div>
                    ) : (
                    pets.map(pet => (
                      <div
                        key={pet.id}
                        onClick={() => {
                          setSelectedPet(pet);
                          setShowPetDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 10px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          background: selectedPet?.id === pet.id ? '#ecfdf5' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{pet.icon || '🐾'}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: selectedPet?.id === pet.id ? '#059669' : '#0f172a' }}>
                              {pet.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {pet.breed || pet.species} • {pet.age}
                            </div>
                          </div>
                        </div>

                        {onOpenEditPet && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPetDropdown(false);
                              onOpenEditPet(pet);
                            }}
                            title="정보 수정"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '13px',
                              padding: '4px',
                              color: '#64748b'
                            }}
                          >
                            ⚙️
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  <div
                    onClick={() => {
                      setShowPetDropdown(false);
                      setShowPetRegisterModal(true);
                    }}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      marginTop: '8px',
                      paddingTop: '9px',
                      textAlign: 'center',
                      fontSize: '12.5px',
                      color: '#10b981',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    + {pets.length === 0 ? '첫 반려동물 등록하기' : '반려동물 추가 등록'}
                  </div>
                </div>
              )}
            </div>

            {/* Login Status & Profile Pill */}
            {user ? (
              <div className="site-navbar__auth" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => {
                    setActiveTab('mypage');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title="마이페이지로 이동"
                  className="card-hover-lift"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 13px',
                    fontSize: '12px',
                    borderRadius: '9999px',
                    background: activeTab === 'mypage' ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' : '#ffffff',
                    color: activeTab === 'mypage' ? '#ffffff' : '#0b0f19',
                    border: activeTab === 'mypage' ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    boxShadow: activeTab === 'mypage' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <span style={{ fontSize: '13px' }}>👤</span>
                  <span>{user.nickname}</span>
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    padding: '6px 11px',
                    fontSize: '11.5px',
                    borderRadius: '9999px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="card-hover-lift"
                style={{
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '800',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                로그인 / 가입
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
          if (onUserChange) onUserChange(loggedInUser);
          setShowLoginModal(false);
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

import React, { useState, useEffect } from 'react';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';

export default function MyPage({ user, pets = [], onUserUpdated, onLogout, onWithdraw, onNavigateHome }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 닉네임 변경 상태
  const [newNickname, setNewNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState(null);
  const [nicknameMessage, setNicknameMessage] = useState({ type: '', text: '' });
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 프로필 데이터 로드
  useEffect(() => {
    if (user) {
      setNewNickname(user.nickname || '');
    }

    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await userApi.getMyProfile();
        if (data) {
          setProfileData(data);
          setNewNickname(data.nickname || '');
        }
      } catch (err) {
        console.warn('내 프로필 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  // 닉네임 실시간 중복 체크
  useEffect(() => {
    if (!newNickname || newNickname.trim().length < 2) {
      setNicknameStatus(null);
      return;
    }
    const currentName = profileData?.nickname || user?.nickname;
    if (newNickname.trim() === currentName) {
      setNicknameStatus({ available: true, message: '현재 사용 중인 닉네임입니다.' });
      return;
    }

    const timer = setTimeout(async () => {
      const res = await authApi.checkNickname(newNickname.trim());
      setNicknameStatus(res);
    }, 400);

    return () => clearTimeout(timer);
  }, [newNickname, profileData?.nickname, user?.nickname]);

  const currentUser = profileData || user || {};
  const isSocialUser = currentUser.provider && currentUser.provider.toUpperCase() !== 'LOCAL';

  // 1. 닉네임 변경 제출
  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    setNicknameMessage({ type: '', text: '' });

    if (!newNickname.trim() || newNickname.trim().length < 2) {
      setNicknameMessage({ type: 'error', text: '닉네임은 2자 이상 입력해주세요.' });
      return;
    }

    if (newNickname.trim() === currentUser.nickname) {
      setNicknameMessage({ type: 'error', text: '현재 닉네임과 동일합니다.' });
      return;
    }

    if (nicknameStatus && !nicknameStatus.available) {
      setNicknameMessage({ type: 'error', text: '이미 사용 중인 닉네임입니다.' });
      return;
    }

    try {
      setIsUpdatingNickname(true);
      const res = await userApi.updateNickname(newNickname.trim());
      if (res?.status === 'SUCCESS' && res.data) {
        setProfileData(res.data);
        const updatedLocalUser = { ...currentUser, nickname: res.data.nickname };
        localStorage.setItem('petcare_user', JSON.stringify(updatedLocalUser));
        if (onUserUpdated) onUserUpdated(updatedLocalUser);
        setNicknameMessage({ type: 'success', text: '🎉 닉네임이 성공적으로 변경되었습니다!' });
        setTimeout(() => setNicknameMessage({ type: '', text: '' }), 4000);
      } else {
        setNicknameMessage({ type: 'error', text: res?.message || '닉네임 변경에 실패했습니다.' });
      }
    } catch (err) {
      setNicknameMessage({
        type: 'error',
        text: err.responseBody?.message || err.message || '닉네임 변경 중 오류가 발생했습니다.'
      });
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  // 2. 비밀번호 변경 제출
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: '모든 비밀번호 필드를 입력해주세요.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호는 8자 이상이어야 합니다.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호가 서로 일치하지 않습니다.' });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMessage({ type: 'error', text: '기존 비밀번호와 다른 새 비밀번호를 입력해주세요.' });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await userApi.updatePassword(currentPassword, newPassword);
      if (res?.status === 'SUCCESS') {
        setPasswordMessage({ type: 'success', text: '🔒 비밀번호가 안전하게 변경되었습니다.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage({ type: '', text: '' }), 4000);
      } else {
        setPasswordMessage({ type: 'error', text: res?.message || '비밀번호 변경에 실패했습니다.' });
      }
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err.responseBody?.message || err.message || '현재 비밀번호를 확인해주세요.'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const formatJoinedDate = (dateStr) => {
    if (!dateStr) return '최근 가입';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <div style={{ background: '#fbfcfd', minHeight: 'calc(100vh - 72px)', padding: '48px 20px 88px 20px' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Top Header & Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '36px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: '800', letterSpacing: '0.3px' }}>ACCOUNT</span>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>/</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>마이페이지</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '900', color: '#0b0f19', letterSpacing: '-0.8px' }}>
              마이페이지
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
              내 프로필 정보 확인, 닉네임 수정 및 비밀번호를 안전하게 변경할 수 있습니다.
            </p>
          </div>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="card-hover-lift"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                color: '#0b0f19',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span>←</span>
              <span>홈으로 돌아가기</span>
            </button>
          )}
        </div>

        {/* 2-Column Responsive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: '26px',
          alignItems: 'start'
        }}>

          {/* LEFT COLUMN: User Summary & Stats Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Profile Overview Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '26px',
              padding: '32px 24px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '38px',
                fontWeight: '900',
                margin: '0 auto 18px auto',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
              }}>
                {currentUser.nickname ? currentUser.nickname.charAt(0) : 'U'}
              </div>


              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                {currentUser.nickname}
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13.5px', color: '#64748b' }}>
                {currentUser.email}
              </p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: '800',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: isSocialUser ? '#fef3c7' : '#ecfdf5',
                  color: isSocialUser ? '#b45309' : '#047857',
                  border: isSocialUser ? '1px solid #fde68a' : '1px solid #a7f3d0'
                }}>
                  {isSocialUser ? `💬 ${currentUser.provider} 소셜 연동` : '🔒 일반 이메일 회원'}
                </span>
              </div>

              <div style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-around',
                fontSize: '13px'
              }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '11.5px', fontWeight: '600' }}>등록된 반려동물</div>
                  <div style={{ color: '#0f172a', fontWeight: '800', fontSize: '17px', marginTop: '2px' }}>
                    {pets.length}마리
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #f1f5f9' }} />
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '11.5px', fontWeight: '600' }}>가입일</div>
                  <div style={{ color: '#0f172a', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>
                    {formatJoinedDate(currentUser.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '22px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)'
            }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '13.5px', fontWeight: '800', color: '#475569' }}>
                계정 보안 및 관리
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  로그아웃
                </button>

                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '14px',
                  marginTop: '4px'
                }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4', marginBottom: '8px' }}>
                    회원 탈퇴 시 기존 데이터는 안전하게 보존되며 즉시 로그아웃 처리됩니다.
                  </div>
                  <button
                    onClick={() => {
                      if (onWithdraw) onWithdraw();
                    }}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      background: '#fff1f2',
                      color: '#e11d48',
                      border: '1px solid #fecdd3',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    회원 탈퇴하기
                  </button>
                </div>
              </div>
            </div>
          </div>


          {/* RIGHT COLUMN: Settings Forms (Nickname & Password) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

            {/* SECTION 1: 닉네임 변경 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '26px',
              padding: '36px 30px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  border: '1px solid #a7f3d0'
                }}>
                  ✏️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '900', color: '#0b0f19', letterSpacing: '-0.3px' }}>
                    닉네임 변경
                  </h3>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                    서비스 내에서 표시되는 활동 이름을 변경합니다.
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdateNickname}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                    새 닉네임 입력
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="새로운 닉네임 (2자 이상)"
                      maxLength={20}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14.5px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingNickname || (nicknameStatus && !nicknameStatus.available)}
                      className="card-hover-lift"
                      style={{
                        padding: '12px 24px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: isUpdatingNickname ? 'not-allowed' : 'pointer',
                        opacity: isUpdatingNickname ? 0.7 : 1,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isUpdatingNickname ? '변경 중...' : '닉네임 저장'}
                    </button>
                  </div>



                  {/* 실시간 닉네임 피드백 */}
                  {nicknameStatus && (
                    <div style={{
                      fontSize: '12.5px',
                      marginTop: '8px',
                      fontWeight: '700',
                      color: nicknameStatus.available ? '#059669' : '#e11d48'
                    }}>
                      {nicknameStatus.available ? '✓ ' : '✕ '}
                      {nicknameStatus.message}
                    </div>
                  )}

                  {nicknameMessage.text && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      background: nicknameMessage.type === 'success' ? '#ecfdf5' : '#fee2e2',
                      color: nicknameMessage.type === 'success' ? '#065f46' : '#991b1b',
                      border: nicknameMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca'
                    }}>
                      {nicknameMessage.text}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                  💡 닉네임을 변경하시면 커뮤니티 작성 글, 댓글, 상단 내비게이션 바에 즉시 반영됩니다.
                </div>
              </form>
            </div>

            {/* SECTION 2: 비밀번호 변경 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '26px',
              padding: '36px 30px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  🔒
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '900', color: '#0b0f19', letterSpacing: '-0.3px' }}>
                    비밀번호 변경
                  </h3>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                    계정 보안을 위해 정기적으로 비밀번호를 변경해 주세요.
                  </span>
                </div>
              </div>


              {isSocialUser ? (
                <div style={{
                  padding: '24px 20px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '16px',
                  textAlign: 'center',
                  color: '#92400e'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800' }}>
                    소셜 로그인 회원 안내
                  </h4>
                  <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.5' }}>
                    현재 계정은 <strong>{currentUser.provider} 소셜 로그인</strong>으로 가입되었습니다.<br />
                    별도의 비밀번호 없이 해당 소셜 계정(카카오/네이버)을 통해 안전하게 로그인하실 수 있습니다.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword}>
                  {/* 현재 비밀번호 */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      현재 비밀번호
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="현재 사용 중인 비밀번호"
                        style={{
                          width: '100%',
                          padding: '12px 42px 12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '15px'
                        }}
                      >
                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                    {/* 새 비밀번호 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                        새 비밀번호
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="새 비밀번호 (8자 이상)"
                          style={{
                            width: '100%',
                            padding: '12px 42px 12px 14px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px'
                          }}
                        >
                          {showNewPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>

                    {/* 새 비밀번호 확인 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                        새 비밀번호 확인
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="새 비밀번호 다시 입력"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* 비밀번호 상태 메시지 */}
                  {passwordMessage.text && (
                    <div style={{
                      padding: '11px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '18px',
                      background: passwordMessage.type === 'success' ? '#ecfdf5' : '#fee2e2',
                      color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b',
                      border: passwordMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca'
                    }}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="card-hover-lift"
                    style={{
                      padding: '13px 30px',
                      borderRadius: '14px',
                      background: '#0b0f19',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      fontWeight: '800',
                      fontSize: '14.5px',
                      cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingPassword ? 0.7 : 1,
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 6px 20px rgba(11, 15, 25, 0.25)'
                    }}
                  >
                    {isUpdatingPassword ? '변경 중...' : '비밀번호 수정 완료'}
                  </button>

                </form>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

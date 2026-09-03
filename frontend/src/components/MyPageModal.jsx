import React, { useState, useEffect } from 'react';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';

export default function MyPageModal({ isOpen, onClose, user, onUserUpdated, onLogout, onWithdraw }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 닉네임 변경 상태
  const [newNickname, setNewNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState(null);
  const [nicknameMessage, setNicknameMessage] = useState('');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 모달 오픈 시 초기화
    setActiveTab('profile');
    setNicknameMessage('');
    setPasswordMessage({ type: '', text: '' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);

    if (user) {
      setNewNickname(user.nickname || '');
    }

    // 최신 프로필 정보 백엔드에서 조회
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
  }, [isOpen, user]);

  // 닉네임 실시간 중복 확인
  useEffect(() => {
    if (!newNickname || newNickname.trim().length < 2) {
      setNicknameStatus(null);
      return;
    }
    // 현재 닉네임과 동일하면 체크 불필요
    if (newNickname.trim() === (profileData?.nickname || user?.nickname)) {
      setNicknameStatus({ available: true, message: '현재 사용 중인 닉네임입니다.' });
      return;
    }

    const timer = setTimeout(async () => {
      const res = await authApi.checkNickname(newNickname.trim());
      setNicknameStatus(res);
    }, 400);

    return () => clearTimeout(timer);
  }, [newNickname, profileData?.nickname, user?.nickname]);

  if (!isOpen) return null;

  const currentUser = profileData || user || {};
  const isSocialUser = currentUser.provider && currentUser.provider.toUpperCase() !== 'LOCAL';

  // 1. 닉네임 변경 제출
  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    if (!newNickname.trim() || newNickname.trim().length < 2) {
      setNicknameMessage('닉네임은 2자 이상 입력해주세요.');
      return;
    }

    if (newNickname.trim() === currentUser.nickname) {
      setNicknameMessage('현재 닉네임과 동일합니다.');
      return;
    }

    if (nicknameStatus && !nicknameStatus.available) {
      setNicknameMessage('이미 사용 중인 닉네임입니다.');
      return;
    }

    try {
      setIsUpdatingNickname(true);
      setNicknameMessage('');
      const res = await userApi.updateNickname(newNickname.trim());
      if (res?.status === 'SUCCESS' && res.data) {
        setProfileData(res.data);
        // localStorage 및 상위 상태 동기화
        const updatedLocalUser = { ...currentUser, nickname: res.data.nickname };
        localStorage.setItem('petcare_user', JSON.stringify(updatedLocalUser));
        if (onUserUpdated) onUserUpdated(updatedLocalUser);
        alert('🎉 닉네임이 성공적으로 변경되었습니다!');
      } else {
        setNicknameMessage(res?.message || '닉네임 변경에 실패했습니다.');
      }
    } catch (err) {
      setNicknameMessage(err.responseBody?.message || err.message || '닉네임 변경 중 오류가 발생했습니다.');
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
        setPasswordMessage({ type: 'success', text: '비밀번호가 안전하게 변경되었습니다.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('🔒 비밀번호가 성공적으로 변경되었습니다.');
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

  // 회원 가입일 포맷팅
  const formatJoinedDate = (dateStr) => {
    if (!dateStr) return '최근 가입';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        className="fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              border: '1px solid #a7f3d0'
            }}>
              👤
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                마이페이지
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                내 계정 정보 및 보안 관리
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '700'
            }}
          >
            ✕
          </button>
        </div>

        {/* User Summary Card */}
        <div style={{ padding: '20px 24px 10px 24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  {currentUser.nickname}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: isSocialUser ? '#fef3c7' : '#e0e7ff',
                  color: isSocialUser ? '#b45309' : '#4338ca',
                  border: isSocialUser ? '1px solid #fde68a' : '1px solid #c7d2fe'
                }}>
                  {currentUser.provider ? currentUser.provider.toUpperCase() : 'LOCAL'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {currentUser.email}
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
                가입일: {formatJoinedDate(currentUser.createdAt)}
              </div>
            </div>

            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: '800',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}>
              {currentUser.nickname ? currentUser.nickname.charAt(0) : 'U'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2.5px solid #059669' : '2.5px solid transparent',
              color: activeTab === 'profile' ? '#059669' : '#64748b',
              fontWeight: activeTab === 'profile' ? '800' : '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ✏️ 닉네임 수정
          </button>
          <button
            onClick={() => setActiveTab('password')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'password' ? '2.5px solid #059669' : '2.5px solid transparent',
              color: activeTab === 'password' ? '#059669' : '#64748b',
              fontWeight: activeTab === 'password' ? '800' : '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🔒 비밀번호 변경
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: 닉네임 변경 */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateNickname}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  변경할 닉네임
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="새로운 닉네임 입력 (2자 이상)"
                    maxLength={20}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* 실시간 닉네임 중복 상태 문구 */}
                {nicknameStatus && (
                  <div style={{
                    fontSize: '12px',
                    marginTop: '6px',
                    fontWeight: '600',
                    color: nicknameStatus.available ? '#059669' : '#e11d48'
                  }}>
                    {nicknameStatus.available ? '✓ ' : '✕ '}
                    {nicknameStatus.message}
                  </div>
                )}

                {nicknameMessage && (
                  <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: '600', color: '#e11d48' }}>
                    {nicknameMessage}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '20px' }}>
                💡 닉네임을 변경하시면 커뮤니티 작성 글, 댓글, 상단 내비게이션 바에 즉시 반영됩니다.
              </div>

              <button
                type="submit"
                disabled={isUpdatingNickname || (nicknameStatus && !nicknameStatus.available)}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '14px',
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: isUpdatingNickname ? 'not-allowed' : 'pointer',
                  opacity: isUpdatingNickname ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isUpdatingNickname ? '변경 중...' : '닉네임 변경 저장'}
              </button>
            </form>
          )}

          {/* TAB 2: 비밀번호 변경 */}
          {activeTab === 'password' && (
            <div>
              {isSocialUser ? (
                <div style={{
                  padding: '24px 20px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '16px',
                  textAlign: 'center',
                  color: '#92400e'
                }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>💬</div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800' }}>
                    소셜 로그인 회원 안내
                  </h4>
                  <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.5' }}>
                    현재 계정은 <strong>{currentUser.provider} 소셜 로그인</strong>으로 가입되었습니다.<br />
                    비밀번호는 해당 소셜 계정(카카오/네이버)에서 안전하게 관리됩니다.
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
                          padding: '11px 40px 11px 14px',
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

                  {/* 새 비밀번호 */}
                  <div style={{ marginBottom: '16px' }}>
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
                          padding: '11px 40px 11px 14px',
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
                  <div style={{ marginBottom: '18px' }}>
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
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* 상태 메시지 */}
                  {passwordMessage.text && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '16px',
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
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '14px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingPassword ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isUpdatingPassword ? '변경 중...' : '비밀번호 수정 완료'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (회원 탈퇴 & 로그아웃) */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12.5px'
        }}>
          <button
            onClick={() => {
              if (onWithdraw) onWithdraw();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
          >
            회원 탈퇴
          </button>

          <button
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

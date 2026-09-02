import React, { useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

export default function LoginPage({ isOpen, onClose, onLoginSuccess, isEmbeddedPage = false }) {
  // 모드 상태: 'login' | 'register' | 'forgot'
  const [viewMode, setViewMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');

  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 실시간 중복 및 유효성 피드백
  const [emailStatus, setEmailStatus] = useState(null); // { available, message }
  const [nicknameStatus, setNicknameStatus] = useState(null); // { available, message }
  const [tempPasswordResult, setTempPasswordResult] = useState('');

  // 비밀번호 보기/숨기기 토글 상태
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 모달이 열릴 때 항상 'login' 모드로 초기화 및 상태 정리
  useEffect(() => {
    if (isOpen) {
      setViewMode('login');
      setMessage('');
      setSuccessMessage('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setNickname('');
      setPhone('');
      setEmailStatus(null);
      setNicknameStatus(null);
      setTempPasswordResult('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setViewMode('login');
    setMessage('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
    setPhone('');
    setEmailStatus(null);
    setNicknameStatus(null);
    setTempPasswordResult('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (onClose) {
      onClose();
    }
  };

  // 소셜 로그인 리다이렉트 실패 에러 파라미터 처리 (?error=deleted_user 등)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'deleted_user') {
        setMessage('탈퇴 처리된 계정입니다. 고객센터에 문의해 주세요.');
      } else if (err === 'inactive_user') {
        setMessage('비활성화되었거나 이용 정지된 계정입니다.');
      } else if (err === 'user_not_found') {
        setMessage('존재하지 않는 회원 정보입니다. 회원가입을 먼저 진행해 주세요.');
      }
    } catch (e) {
      console.warn('URL 파라미터 파싱 오류:', e);
    }
  }, []);

  // 이메일 유효성 및 중복 실시간 디바운스 체크 (회원가입 모드)
  useEffect(() => {
    if (viewMode !== 'register' || !email || !email.includes('@')) {
      setEmailStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await authApi.checkEmail(email);
      setEmailStatus(res);
    }, 400);
    return () => clearTimeout(timer);
  }, [email, viewMode]);

  // 닉네임 실시간 디바운스 체크 (회원가입 모드)
  useEffect(() => {
    if (viewMode !== 'register' || !nickname || nickname.trim().length < 2) {
      setNicknameStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await authApi.checkNickname(nickname);
      setNicknameStatus(res);
    }, 400);
    return () => clearTimeout(timer);
  }, [nickname, viewMode]);

  if (!isOpen && !isEmbeddedPage) return null;

  // 비밀번호 유효성 검사 (영문, 숫자, 특수문자 8자 이상)
  const isPasswordValid = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(password);
  const isPasswordMatch = password && confirmPassword && password === confirmPassword;

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccessMessage('');
    setTempPasswordResult('');

    if (viewMode === 'forgot') {
      if (!email) {
        setMessage('가입하신 이메일 주소를 입력해 주세요.');
        return;
      }
      try {
        setLoading(true);
        const res = await authApi.forgotPassword(email.trim());
        setSuccessMessage(res.message || '임시 비밀번호가 발급되었습니다.');
        if (res.tempPassword) {
          setTempPasswordResult(res.tempPassword);
        }
      } catch (err) {
        setMessage(err.message || '비밀번호 재설정에 실패했습니다.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setMessage('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (viewMode === 'register') {
      if (!isPasswordValid) {
        setMessage('비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (emailStatus && !emailStatus.available) {
        setMessage('이미 사용 중인 이메일 주소입니다.');
        return;
      }
      if (nicknameStatus && !nicknameStatus.available) {
        setMessage('이미 사용 중인 닉네임입니다.');
        return;
      }
    }

    try {
      setLoading(true);

      if (viewMode === 'register') {
        // 백엔드 회원가입 API 호출 (POST /api/v1/auth/signup)
        const response = await authApi.signup({
          email: email.trim(),
          password: password.trim(),
          nickname: nickname.trim(),
          phone: phone.trim()
        });

        if (response && response.accessToken) {
          localStorage.setItem('petcare_token', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('petcare_refresh_token', response.refreshToken);
          }
          localStorage.setItem('petcare_user', JSON.stringify(response.user));

          if (onLoginSuccess) {
            onLoginSuccess(response.user);
          }
          if (onClose) {
            onClose();
          }
        }
      } else {
        // 백엔드 로그인 API 호출 (POST /api/v1/auth/login)
        const response = await authApi.login({
          email: email.trim(),
          password: password.trim()
        });

        if (response && response.accessToken) {
          localStorage.setItem('petcare_token', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('petcare_refresh_token', response.refreshToken);
          }
          localStorage.setItem('petcare_user', JSON.stringify(response.user));

          if (onLoginSuccess) {
            onLoginSuccess(response.user);
          }
          if (onClose) {
            onClose();
          }
        }
      }
    } catch (err) {
      setMessage(err.message || '인증 처리에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    const backendOAuthUrl = `http://localhost:8080/oauth2/authorization/${provider}`;
    window.location.href = backendOAuthUrl;
  };

  const formCardContent = (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '460px',
      background: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.1)',
      border: '1px solid #e2e8f0',
      padding: '32px 28px',
      margin: '0 auto'
    }}>
      {/* Close Button if Modal */}
      {!isEmbeddedPage && onClose && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      )}

      {/* Brand Logo Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          margin: '0 auto 12px auto',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
        }}>
          🐾
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          {viewMode === 'register' ? 'PetCare 회원가입' : (viewMode === 'forgot' ? '비밀번호 찾기' : 'PetCare 로그인')}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '4px', margin: 0 }}>
          {viewMode === 'forgot' ? '등록된 이메일로 안전한 임시 비밀번호를 발급해 드립니다.' : 'AI 기반 반려동물 스마트 헬스케어 플랫폼'}
        </p>
      </div>

      {/* Message Notifications */}
      {message && (
        <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '12px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
          ⚠️ {message}
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '13px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
          ✅ {successMessage}
          {tempPasswordResult && (
            <div style={{ marginTop: '8px', padding: '8px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #059669', fontSize: '14px', letterSpacing: '1px', color: '#0f172a', fontWeight: '900' }}>
              임시 비밀번호: <span style={{ color: '#2563eb' }}>{tempPasswordResult}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleLocalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        
        {/* 회원가입 시: 닉네임 */}
        {viewMode === 'register' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>닉네임</label>
              {nicknameStatus && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: nicknameStatus.available ? '#059669' : '#e11d48' }}>
                  {nicknameStatus.available ? '✓ 사용 가능' : '✗ ' + nicknameStatus.message}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="예: 초코마미"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
            />
          </div>
        )}

        {/* 이메일 주소 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>이메일 주소</label>
            {viewMode === 'register' && emailStatus && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: emailStatus.available ? '#059669' : '#e11d48' }}>
                {emailStatus.available ? '✓ 사용 가능' : '✗ ' + emailStatus.message}
              </span>
            )}
          </div>
          <input
            type="email"
            placeholder="user@petcare.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
          />
        </div>

        {/* 비밀번호 (로그인 / 회원가입) */}
        {viewMode !== 'forgot' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              비밀번호
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showPassword ? '#059669' : '#94a3b8'
                }}
              >
                {showPassword ? (
                  /* Eye Open SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  /* Eye Slash / Closed SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
            </div>
            {viewMode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setViewMode('forgot'); setMessage(''); setSuccessMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11.5px', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  비밀번호 찾기
                </button>
              </div>
            )}
            {viewMode === 'register' && password && (
              <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '600', color: isPasswordValid ? '#059669' : '#e11d48' }}>
                {isPasswordValid ? '✓ 안전한 비밀번호 형식입니다.' : '✗ 영문, 숫자, 특수문자 포함 8자 이상 필요'}
              </div>
            )}
          </div>
        )}

        {/* 회원가입 시: 비밀번호 확인 */}
        {viewMode === 'register' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>비밀번호 확인</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showConfirmPassword ? '#059669' : '#94a3b8'
                }}
              >
                {showConfirmPassword ? (
                  /* Eye Open SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  /* Eye Slash / Closed SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword && (
              <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '600', color: isPasswordMatch ? '#059669' : '#e11d48' }}>
                {isPasswordMatch ? '✓ 비밀번호가 일치합니다.' : '✗ 비밀번호가 일치하지 않습니다.'}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px',
            background: loading ? '#94a3b8' : '#10b981',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '800',
            borderRadius: '14px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '6px',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.3)'
          }}
        >
          {loading ? '처리 중...' : (
            viewMode === 'register' ? '회원가입 완료' : (
              viewMode === 'forgot' ? '임시 비밀번호 발급' : '이메일 로그인'
            )
          )}
        </button>
      </form>

      {/* Social Login (Only on Login or Register mode) */}
      {viewMode !== 'forgot' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
            <div style={{ borderTop: '1px solid #e2e8f0', flex: 1 }}></div>
            <span style={{ background: '#ffffff', padding: '0 12px', fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
              또는 소셜 계정으로 로그인
            </span>
            <div style={{ borderTop: '1px solid #e2e8f0', flex: 1 }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => handleSocialLogin('kakao')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#FEE500',
                color: '#191919',
                fontWeight: '700',
                fontSize: '13px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '16px' }}>💬</span> 카카오로 로그인
            </button>

            <button
              onClick={() => handleSocialLogin('naver')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#03CF5D',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: '900' }}>N</span> 네이버로 로그인
            </button>
          </div>
        </>
      )}

      {/* Toggle View Mode Buttons */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
        {viewMode === 'register' && (
          <span>
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => { setViewMode('login'); setMessage(''); setSuccessMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
            >
              로그인하기
            </button>
          </span>
        )}

        {viewMode === 'login' && (
          <span>
            아직 회원이 아니신가요?{' '}
            <button
              onClick={() => { setViewMode('register'); setMessage(''); setSuccessMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
            >
              회원가입하기
            </button>
          </span>
        )}

        {viewMode === 'forgot' && (
          <span>
            비밀번호가 기억나셨나요?{' '}
            <button
              onClick={() => { setViewMode('login'); setMessage(''); setSuccessMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
            >
              로그인으로 돌아가기
            </button>
          </span>
        )}
      </div>

    </div>
  );

  if (isEmbeddedPage) {
    return (
      <div style={{ padding: '60px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {formCardContent}
      </div>
    );
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        padding: '20px'
      }}
    >
      {formCardContent}
    </div>
  );
}

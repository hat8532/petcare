import React, { useState } from 'react';

export default function LoginPage({ isOpen, onClose, onLoginSuccess, isEmbeddedPage = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen && !isEmbeddedPage) return null;

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    const userPayload = {
      id: 1,
      email: email,
      nickname: nickname || (email.split('@')[0] + '님'),
      role: 'ROLE_USER'
    };

    localStorage.setItem('petcare_token', 'mock_jwt_token_2026');
    localStorage.setItem('petcare_user', JSON.stringify(userPayload));

    if (onLoginSuccess) {
      onLoginSuccess(userPayload);
    }
    if (onClose) {
      onClose();
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
      maxWidth: '440px',
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
          onClick={onClose}
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
          {isRegister ? 'PetCare 회원가입' : 'PetCare 로그인'}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '4px', margin: 0 }}>
          AI 기반 반려동물 스마트 헬스케어 플랫폼
        </p>
      </div>

      {/* 1. TOP: Local Email & Password Form (위치 변경: 이메일 로그인 상단 배치) */}
      <form onSubmit={handleLocalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        {message && (
          <div style={{ padding: '10px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>
            {message}
          </div>
        )}

        {isRegister && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>닉네임</label>
            <input
              type="text"
              placeholder="예: 초코마미"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>이메일 주소</label>
          <input
            type="email"
            placeholder="user@petcare.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>비밀번호</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '13px',
            background: '#10b981',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '800',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '4px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
          }}
        >
          {isRegister ? '회원가입 완료' : '이메일 로그인'}
        </button>
      </form>

      {/* 2. MIDDLE: Divider */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ borderTop: '1px solid #e2e8f0', flex: 1 }}></div>
        <span style={{ background: '#ffffff', padding: '0 12px', fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
          또는 소셜 계정으로 로그인
        </span>
        <div style={{ borderTop: '1px solid #e2e8f0', flex: 1 }}></div>
      </div>

      {/* 3. BOTTOM: Social Login Buttons (위치 변경: 소셜 로그인 하단 배치) */}
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
          <span style={{ fontSize: '16px' }}>💬</span> 카카오로 3초 만에 시작하기
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
          <span style={{ fontSize: '15px', fontWeight: '900' }}>N</span> 네이버로 시작하기
        </button>

        <button
          onClick={() => handleSocialLogin('google')}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#ffffff',
            color: '#334155',
            fontWeight: '700',
            fontSize: '13px',
            borderRadius: '14px',
            border: '1px solid #cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '16px' }}>🌐</span> 구글 계정으로 로그인
        </button>
      </div>

      {/* Toggle Mode */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
        {isRegister ? (
          <span>
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => setIsRegister(false)}
              style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
            >
              로그인하기
            </button>
          </span>
        ) : (
          <span>
            아직 회원이 아니신가요?{' '}
            <button
              onClick={() => setIsRegister(true)}
              style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '800', cursor: 'pointer' }}
            >
              회원가입하기
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
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      padding: '20px'
    }}>
      {formCardContent}
    </div>
  );
}

import React, { useEffect, useState } from 'react';

export default function OAuth2CallbackPage({ onLoginSuccess }) {
  const [statusText, setStatusText] = useState('소셜 로그인 인증 처리 중입니다...');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');
      const email = params.get('email');
      const nickname = params.get('nickname');
      const role = params.get('role');
      const id = params.get('id');

      if (!accessToken) {
        setErrorText('인증 토큰을 불러올 수 없습니다. 다시 로그인해 주세요.');
        return;
      }

      // 토큰 및 사용자 정보 저장
      localStorage.setItem('petcare_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('petcare_refresh_token', refreshToken);
      }

      const userPayload = {
        id: id ? Number(id) : 1,
        email: email || '',
        nickname: nickname ? decodeURIComponent(nickname) : '소셜회원',
        role: role || 'ROLE_USER'
      };

      localStorage.setItem('petcare_user', JSON.stringify(userPayload));
      setStatusText('로그인 완료! 메인 화면으로 이동합니다...');

      // 상태 업데이트 및 메인 화면으로 부드럽게 전환 (SPA 방식)
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
        if (onLoginSuccess) {
          onLoginSuccess(userPayload);
        }
      }, 500);

    } catch (e) {
      console.error('OAuth2 Callback 처리 에러:', e);
      setErrorText('로그인 정보 처리 중 오류가 발생했습니다.');
    }
  }, [onLoginSuccess]);

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#f8fafc'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '36px 28px',
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.1)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: errorText ? '#fee2e2' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: errorText ? '#ef4444' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          margin: '0 auto 20px auto',
          boxShadow: errorText ? 'none' : '0 6px 18px rgba(16, 185, 129, 0.3)'
        }}>
          {errorText ? '⚠️' : '🐾'}
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
          {errorText ? '로그인 실패' : '소셜 로그인 연동'}
        </h2>

        <p style={{ fontSize: '14px', color: errorText ? '#e11d48' : '#64748b', fontWeight: '600', marginBottom: '24px', lineHeight: '1.5' }}>
          {errorText || statusText}
        </p>

        {errorText ? (
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            홈으로 돌아가기
          </button>
        ) : (
          <div style={{
            display: 'inline-block',
            width: '28px',
            height: '28px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#059669',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

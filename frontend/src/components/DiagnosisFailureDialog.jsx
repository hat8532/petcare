import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function DiagnosisFailureDialog({ failure, isRetrying, onRetry, onClose }) {
  const dialogRef = useRef(null);
  const retryButtonRef = useRef(null);

  useEffect(() => {
    if (!failure) return undefined;

    const appRoot = document.getElementById('root');
    const previouslyFocused = document.activeElement;
    appRoot?.setAttribute('inert', '');
    const focusFrame = window.requestAnimationFrame(() => {
      const firstAction = failure.canRetry ? retryButtonRef.current : dialogRef.current?.querySelector('button');
      firstAction?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isRetrying) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || []
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      focusable[nextIndex].focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      appRoot?.removeAttribute('inert');
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [failure, isRetrying, onClose]);

  if (!failure) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="diagnosis-failure-title"
      aria-describedby="diagnosis-failure-description"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'grid',
        placeItems: 'center',
        padding: '20px',
        background: 'rgba(15, 23, 42, 0.72)'
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width: 'min(520px, 100%)',
          padding: '28px',
          border: '2px solid #f59e0b',
          borderRadius: '20px',
          background: '#fffbeb',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)'
        }}
      >
        <span className="badge badge-amber">ANALYSIS NOTICE</span>
        <h3 id="diagnosis-failure-title" style={{ marginBottom: '10px' }}>
          Image 분석을 완료하지 못했습니다.
        </h3>
        <p id="diagnosis-failure-description" style={{ color: '#475569', lineHeight: 1.7 }}>
          {failure.message}
        </p>
        {failure.code && (
          <p style={{ color: '#92400e', fontSize: '12px' }}>Failure code: {failure.code}</p>
        )}
        <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>
          {failure.canRetry
            ? '실패 상태에서는 질환명이나 확률을 임의로 생성하지 않습니다. 입력은 유지되며 사용자가 직접 다시 시도할 수 있습니다.'
            : '실패 상태에서는 질환명이나 확률을 임의로 생성하지 않습니다. 입력 기반 Safety Triage 결과만 저장했으며 Provider 환경이 준비된 뒤 새로 실행할 수 있습니다.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
          {failure.canRetry && (
            <button
              ref={retryButtonRef}
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="btn btn-primary"
            >
              {isRetrying ? '다시 분석 중…' : '다시 시도'}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={isRetrying} className="btn btn-secondary">
            결과 화면 확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

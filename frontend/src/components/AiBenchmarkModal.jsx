import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function AiBenchmarkModal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const appRoot = document.getElementById('root');
    const previouslyFocused = document.activeElement;
    appRoot?.setAttribute('inert', '');
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        modalRef.current?.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || []
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1);
      focusableElements[nextIndex].focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      appRoot?.removeAttribute('inert');
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-benchmark-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div ref={modalRef} style={{
        position: 'relative',
        width: '100%',
        maxWidth: '880px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #f1f5f9',
        padding: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '14px', background: '#ecfdf5', display: 'grid', placeItems: 'center', color: '#059669', fontSize: '22px', fontWeight: '800' }}>
              ⚡
            </div>
            <div>
              <h2 id="ai-benchmark-title" style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                PetCare AI 평가 Protocol & 공개 상태
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', margin: '2px 0 0' }}>
                검증된 Dataset·Split·Metric이 준비된 뒤 동일 조건에서 Model을 비교합니다.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="AI 평가 안내 닫기"
            style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%', background: '#f1f5f9', border: 'none', color: '#64748b', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            ['Dataset', '승인 대기', '출처·License·Class 분포 확인 전', '#ecfdf5', '#047857', '#a7f3d0'],
            ['Pet Group Split', '미확정', '동일 Pet의 평가 누수 차단 필요', '#eff6ff', '#1d4ed8', '#bfdbfe'],
            ['공개 성능 수치', '비공개', '재현 Evidence와 팀 승인 전 차단', '#fffbeb', '#b45309', '#fde68a']
          ].map(([label, status, description, background, color, border]) => (
            <div key={label} style={{ background, border: `1px solid ${border}`, borderRadius: '18px', padding: '20px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '700', color, marginBottom: '6px' }}>{label}</span>
              <strong style={{ display: 'block', fontSize: '28px', fontWeight: '900', color }}>{status}</strong>
              <span style={{ display: 'block', marginTop: '8px', fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>{description}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📊 평가 진입 Gate</h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '8px' }}>
              EVALUATION PENDING
            </span>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {[
              ['01', 'Dataset 계약', 'Source·License·Species·환부·Class와 minimum support를 고정합니다.'],
              ['02', '누수 방지 Split', 'Train·Validation·Test를 동일 Pet 단위로 분리합니다.'],
              ['03', '동일 평가 환경', 'Baseline과 후보 Model을 같은 전처리·Metric·Latency 조건에서 비교합니다.'],
              ['04', '안전성·독립 재현', '응급 Recall·OOD abstention·Report 안전성을 확인하고 다른 Reviewer가 재현합니다.']
            ].map(([number, title, description]) => (
              <div key={number} style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: '12px', alignItems: 'center', padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <span style={{ width: '36px', height: '36px', display: 'grid', placeItems: 'center', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: '900' }}>{number}</span>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '13px' }}>{title}</strong>
                  <span style={{ display: 'block', marginTop: '2px', color: '#64748b', fontSize: '12px', lineHeight: 1.55 }}>{description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div role="note" style={{ padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', color: '#9a3412', fontSize: '12.5px', lineHeight: 1.65, marginBottom: '22px' }}>
          기존 94.8%·F1 0.93·180ms 같은 숫자는 현재 Repository에서 재현되지 않았습니다. 승인된 평가 Artifact가 생기기 전까지 제품 성능으로 표시하지 않습니다.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>📄 결과는 Dataset·Model Manifest와 재현 Evidence에 연결합니다.</span>
          <button type="button" onClick={onClose} className="btn btn-primary">확인</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

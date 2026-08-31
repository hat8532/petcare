import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function CareFlowBranch({ diagnosisResult, onNavigateTimeline, onNavigateHospital }) {
  const riskLevel = diagnosisResult?.riskLevel;
  const isEmergency = riskLevel === 'EMERGENCY';
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const modalRef = useRef(null);
  const primaryActionRef = useRef(null);

  useEffect(() => {
    setIsEmergencyModalOpen(isEmergency);
  }, [diagnosisResult?.diagnosisId, isEmergency]);

  useEffect(() => {
    if (!isEmergencyModalOpen) return undefined;

    const appRoot = document.getElementById('root');
    const previouslyFocused = document.activeElement;
    appRoot?.setAttribute('inert', '');

    const focusFrame = window.requestAnimationFrame(() => primaryActionRef.current?.focus());
    const handleModalKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsEmergencyModalOpen(false);
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

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleModalKeyDown);
      appRoot?.removeAttribute('inert');
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isEmergencyModalOpen]);

  const navigateToEmergencyHospital = () => {
    setIsEmergencyModalOpen(false);
    onNavigateHospital?.();
  };

  const emergencyModal = isEmergencyModalOpen
    ? createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-diagnosis-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.72)'
        }}
      >
        <div
          ref={modalRef}
          style={{
            width: 'min(520px, 100%)',
            padding: '28px',
            border: '2px solid #fb7185',
            borderRadius: '20px',
            background: '#fff1f2',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)'
          }}
        >
          <span className="badge badge-rose">EMERGENCY</span>
          <h3 id="emergency-diagnosis-title" style={{ marginBottom: '10px' }}>
            응급 위험 신호가 입력되었습니다.
          </h3>
          <p style={{ color: '#475569', lineHeight: 1.7 }}>
            이 화면은 확정 진단이 아닙니다. 지체하지 말고 가까운 응급 동물병원에 연락한 뒤 병원의 안내에 따라 이동하세요.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
            <button
              ref={primaryActionRef}
              type="button"
              onClick={navigateToEmergencyHospital}
              className="btn btn-danger"
            >
              주변 응급 동물병원 찾기
            </button>
            <button type="button" onClick={() => setIsEmergencyModalOpen(false)} className="btn btn-secondary">
              결과 계속 확인
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <section style={{ padding: '36px 0', background: '#f8fafc' }}>
      {emergencyModal}

      <div className="container">
        <div className="section-header">
          <span className="badge badge-indigo">SAFETY CARE FLOW</span>
          <h2>위험도에 따른 다음 행동</h2>
          <p>사용자가 임의로 분기를 고르는 대신, 가장 최근 Safety Triage 결과와 연결됩니다.</p>
        </div>

        {!diagnosisResult ? (
          <div className="glass-card" style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
            진단 결과가 생성되면 OBSERVATION·CAUTION·EMERGENCY에 맞는 경로가 표시됩니다.
          </div>
        ) : (
          <div
            className="glass-card"
            style={{
              padding: '30px',
              border: isEmergency ? '2px solid #fb7185' : '2px solid #6ee7b7',
              background: isEmergency ? '#fff1f2' : '#f0fdf4'
            }}
          >
            <span className={`badge ${isEmergency ? 'badge-rose' : riskLevel === 'CAUTION' ? 'badge-amber' : 'badge-emerald'}`}>
              {diagnosisResult.riskLabel}
            </span>
            <h3 style={{ marginBottom: '8px' }}>
              {isEmergency ? '응급 동물병원에 연락하고 이동하세요.' : '증상을 기록하고 필요 시 수의사와 상담하세요.'}
            </h3>
            <ul style={{ lineHeight: 1.8 }}>
              {(diagnosisResult.actionGuidance || []).map((guidance) => <li key={guidance}>{guidance}</li>)}
            </ul>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              {isEmergency ? (
                <button type="button" onClick={navigateToEmergencyHospital} className="btn btn-danger">
                  주변 응급 동물병원 찾기
                </button>
              ) : (
                <>
                  <button type="button" onClick={onNavigateTimeline} className="btn btn-primary">
                    경과 관찰로 이동
                  </button>
                  <button type="button" onClick={onNavigateHospital} className="btn btn-secondary">
                    주변 병원 보기
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

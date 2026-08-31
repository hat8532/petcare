import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hospitalApi } from '../api/hospitalApi';

const safeMapUrl = (value) => typeof value === 'string' && value.startsWith('https://') ? value : null;
const OFFICIAL_MAP_SEARCH_URL = 'https://map.naver.com/p/search/24시%20동물병원';

function NearbyHospitalResults({ hospitals, isLoading, error }) {
  if (isLoading) return <p role="status">현재 위치를 확인하고 24시 응급 병원을 조회하고 있습니다.</p>;
  if (error) {
    return (
      <div role="alert" style={{ marginTop: '14px', color: '#b91c1c' }}>
        <p>{error}</p>
        <a href={OFFICIAL_MAP_SEARCH_URL} target="_blank" rel="noreferrer" className="btn btn-secondary">
          공식 지도 검색 열기
        </a>
      </div>
    );
  }
  if (hospitals.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }} aria-live="polite">
      <strong>현재 위치 기준 가까운 24시 병원 {hospitals.length}곳</strong>
      {hospitals.map((hospital, index) => (
        <article key={hospital.id || `${hospital.name}-${index}`} style={{ padding: '14px', border: '1px solid #fecdd3', borderRadius: '12px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <strong>{index + 1}. {hospital.name}</strong>
            {Number.isFinite(Number(hospital.distance)) && <span>{Number(hospital.distance).toFixed(1)}km</span>}
          </div>
          <p style={{ margin: '6px 0', color: '#475569', fontSize: '13px' }}>{hospital.address}</p>
          <p style={{ margin: '6px 0', color: '#9f1239', fontSize: '12px' }}>
            이동 전 전화로 현재 진료 가능 여부와 24시 운영 여부를 반드시 확인하세요.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <a href={`tel:${String(hospital.phone).replace(/[^0-9+]/g, '')}`} className="btn btn-danger">
              {hospital.phone} 전화
            </a>
            {safeMapUrl(hospital.sourceUrl) && (
              <a href={hospital.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                지도에서 확인
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CareFlowBranch({ diagnosisResult, onNavigateTimeline, lookupRequestId = 0 }) {
  const riskLevel = diagnosisResult?.riskLevel;
  const isEmergency = riskLevel === 'EMERGENCY';
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [isHospitalLoading, setIsHospitalLoading] = useState(false);
  const [hospitalError, setHospitalError] = useState('');
  const modalRef = useRef(null);
  const primaryActionRef = useRef(null);

  useEffect(() => {
    setIsEmergencyModalOpen(isEmergency);
    setNearbyHospitals([]);
    setHospitalError('');
  }, [diagnosisResult?.diagnosisId, isEmergency]);

  useEffect(() => {
    if (lookupRequestId > 0 && diagnosisResult) {
      setIsEmergencyModalOpen(true);
    }
  }, [lookupRequestId, diagnosisResult]);

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

      event.preventDefault();
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1);
      focusableElements[nextIndex].focus();
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

  const findNearbyHospitals = () => {
    setNearbyHospitals([]);
    setHospitalError('');

    if (!navigator.geolocation) {
      setHospitalError('이 Browser에서는 위치 정보를 사용할 수 없습니다. 공식 지도 앱에서 24시 동물병원을 직접 확인해 주세요.');
      return;
    }

    setIsHospitalLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const records = await hospitalApi.getNearbyHospitals(coords.latitude, coords.longitude, true);
          const verifiedShape = records
            .filter((hospital) => hospital
              && hospital.sourceVerified === true
              && safeMapUrl(hospital.sourceUrl)
              && hospital.isEmergency24h === true
              && hospital.name
              && hospital.phone
              && hospital.address)
            .slice(0, 3);

          setNearbyHospitals(verifiedShape);
          if (verifiedShape.length === 0) {
            setHospitalError('팀 DB에 출처가 검증된 24시 병원 정보가 없습니다. 검증되지 않은 seed 병원명·전화번호는 안전상 표시하지 않습니다.');
          }
        } catch (error) {
          setHospitalError(error?.message || '병원 정보를 불러오지 못했습니다. 공식 지도 앱에서 24시 운영 여부를 확인해 주세요.');
        } finally {
          setIsHospitalLoading(false);
        }
      },
      () => {
        setIsHospitalLoading(false);
        setHospitalError('위치 권한이 없어 주변 병원을 조회하지 못했습니다. 위치 권한을 허용하거나 공식 지도 앱에서 직접 확인해 주세요.');
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 }
    );
  };

  const emergencyModal = isEmergencyModalOpen
    ? createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-diagnosis-title"
        aria-describedby="emergency-diagnosis-description"
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
            border: isEmergency ? '2px solid #fb7185' : '2px solid #818cf8',
            borderRadius: '20px',
            background: isEmergency ? '#fff1f2' : '#eef2ff',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)'
          }}
        >
          <span className={`badge ${isEmergency ? 'badge-rose' : 'badge-indigo'}`}>
            {isEmergency ? 'EMERGENCY' : 'NEARBY HOSPITALS'}
          </span>
          <h3 id="emergency-diagnosis-title" style={{ marginBottom: '10px' }}>
            {isEmergency ? '응급 위험 신호가 입력되었습니다.' : '현재 위치로 주변 병원을 조회합니다.'}
          </h3>
          <p id="emergency-diagnosis-description" style={{ color: '#475569', lineHeight: 1.7 }}>
            {isEmergency
              ? '이 화면은 확정 진단이 아닙니다. 지체하지 말고 가까운 응급 동물병원에 연락한 뒤 병원의 안내에 따라 이동하세요.'
              : 'Browser가 제공한 현재 위치를 이번 조회에만 사용합니다. 병원 운영 정보는 이동 전에 전화로 다시 확인하세요.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
            <button
              ref={primaryActionRef}
              type="button"
              onClick={findNearbyHospitals}
              disabled={isHospitalLoading}
              className={isEmergency ? 'btn btn-danger' : 'btn btn-primary'}
            >
              {isHospitalLoading ? '병원 조회 중…' : '현재 위치로 검증 병원 조회'}
            </button>
            <button type="button" onClick={() => setIsEmergencyModalOpen(false)} className="btn btn-secondary">
              결과 계속 확인
            </button>
          </div>
          <NearbyHospitalResults hospitals={nearbyHospitals} isLoading={isHospitalLoading} error={hospitalError} />
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <section id="diagnosis-care-flow" style={{ padding: '36px 0', background: '#f8fafc' }}>
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
              {isEmergency ? (
                <button type="button" onClick={() => setIsEmergencyModalOpen(true)} className="btn btn-danger">
                  현재 위치로 응급 병원 조회
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => onNavigateTimeline?.(diagnosisResult)} className="btn btn-primary">
                    3일 뒤 경과 기록하기
                  </button>
                  <button type="button" onClick={() => setIsEmergencyModalOpen(true)} className="btn btn-secondary">
                    현재 위치로 주변 병원 조회
                  </button>
                </>
              )}
            </div>
            {!isEmergency && (
              <p style={{ marginBottom: 0, color: '#9a3412', fontSize: '13px' }}>
                증상이 악화되거나 새로운 위험 신호가 생기면 3일을 기다리지 말고 동물병원에 문의하세요.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

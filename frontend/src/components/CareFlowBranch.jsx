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
  // Mount 전에 남은 번호는 과거 클릭이다. 현재 화면에서 새로 바뀐 요청만 한 번 처리한다.
  const handledLookupRequestRef = useRef(lookupRequestId);

  useEffect(() => {
    setIsEmergencyModalOpen(isEmergency);
    setNearbyHospitals([]);
    setHospitalError('');
  }, [diagnosisResult?.diagnosisId, isEmergency]);

  useEffect(() => {
    if (lookupRequestId === handledLookupRequestRef.current) return;
    handledLookupRequestRef.current = lookupRequestId;
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
    <section id="diagnosis-care-flow" style={{ padding: '60px 0', background: '#f8fafc' }}>
      {emergencyModal}

      <div className="container">
        <div className="section-header" style={{ marginBottom: '32px', textAlign: 'center' }}>
          <span className="badge badge-indigo" style={{ marginBottom: '12px' }}>SMART BRANCHING SYSTEM</span>
          <h2 style={{ margin: '10px 0 6px', color: '#0f172a', fontSize: '30px', fontWeight: '900' }}>위험도 판정에 따른 동적 헬스케어 루프</h2>
          <p style={{ margin: 0, color: '#475569', fontSize: '14.5px' }}>가장 최근 Safety Triage 결과에 맞춰 관찰 또는 응급 경로를 자동으로 안내합니다.</p>
        </div>

        {!diagnosisResult ? (
          <div className="glass-card" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', background: '#ffffff' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span className="badge badge-indigo" style={{ fontSize: '13px' }}>진단 결과 연결 대기</span>
              <h3 style={{ margin: '14px 0 8px', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                진단이 완료되면 알맞은 케어 경로가 열립니다.
              </h3>
              <p style={{ margin: 0, color: '#64748b', lineHeight: 1.7 }}>
                사용자가 경로를 임의로 고르지 않고 실제 위험도 결과에 따라 자동 분기됩니다.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px' }}>
              <article style={{ padding: '22px', borderRadius: '18px', border: '1px solid #a7f3d0', background: '#f0fdf4' }}>
                <span className="badge badge-emerald">OBSERVATION · CAUTION</span>
                <h4 style={{ margin: '14px 0 8px', color: '#047857', fontSize: '17px' }}>경과 관찰 경로</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '13px', lineHeight: 1.7 }}>
                  리포트를 확인하고 같은 반려동물·같은 환부의 다음 기록으로 이동합니다.
                </p>
              </article>
              <article style={{ padding: '22px', borderRadius: '18px', border: '1px solid #fecdd3', background: '#fff1f2' }}>
                <span className="badge badge-rose">EMERGENCY</span>
                <h4 style={{ margin: '14px 0 8px', color: '#be123c', fontSize: '17px' }}>즉시 병원 확인 경로</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '13px', lineHeight: 1.7 }}>
                  응급 안내를 우선 표시하고 출처가 검증된 24시 병원만 조회합니다.
                </p>
              </article>
            </div>
          </div>
        ) : (
          <div
            className="glass-card"
            style={{
              padding: '40px',
              maxWidth: '900px',
              margin: '0 auto',
              border: isEmergency ? '2px solid #fb7185' : '2px solid #6ee7b7',
              background: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <span className={`badge ${isEmergency ? 'badge-rose' : riskLevel === 'CAUTION' ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '14px' }}>
                위험도: {diagnosisResult.riskLabel}
              </span>
              <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                진단 #{diagnosisResult.diagnosisId} 결과에 연결됨
              </span>
            </div>

            <h3 style={{ margin: '0 0 22px', fontSize: '22px', fontWeight: '800', color: isEmergency ? '#be123c' : '#0f172a' }}>
              {isEmergency
                ? '타임라인 생략 → 주변 응급 동물병원 확인'
                : '진단 리포트 확인 → 같은 환부 경과 기록'}
            </h3>

            <div className="grid-3" style={{ marginTop: '20px' }}>
              {(isEmergency ? [
                {
                  icon: '!',
                  title: '응급 안내 확인',
                  description: '확정 진단이 아닌 위험 신호 안내임을 확인하고 지체 없이 병원에 연락합니다.'
                },
                {
                  icon: '◎',
                  title: '현재 위치 조회',
                  description: 'Browser 위치를 이번 조회에만 사용해 출처가 검증된 24시 병원을 찾습니다.'
                },
                {
                  icon: '↗',
                  title: '전화 후 이동',
                  description: '표시된 전화번호와 공식 지도로 운영 여부를 다시 확인한 뒤 이동합니다.'
                }
              ] : [
                {
                  icon: '1',
                  title: '진단 리포트 확인',
                  description: '입력한 증상과 Safety Triage 결과, 다음 행동 안내를 함께 확인합니다.'
                },
                {
                  icon: '2',
                  title: '경과 관찰',
                  description: '증상 변화를 기록하고 악화되거나 새 위험 신호가 생기는지 살핍니다.'
                },
                {
                  icon: '3',
                  title: '같은 환부 재기록',
                  description: '같은 반려동물·같은 환부를 다시 촬영해 실제 비교 기록을 준비합니다.'
                }
              ]).map((step) => (
                <article
                  key={step.title}
                  style={{
                    minHeight: '150px',
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isEmergency ? '#fecdd3' : '#d1fae5'}`,
                    background: isEmergency ? '#fff1f2' : '#f0fdf4'
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '32px',
                      height: '32px',
                      marginBottom: '12px',
                      borderRadius: '10px',
                      background: isEmergency ? '#e11d48' : '#059669',
                      color: '#ffffff',
                      fontWeight: '900'
                    }}
                  >
                    {step.icon}
                  </span>
                  <div style={{ marginBottom: '6px', color: isEmergency ? '#be123c' : '#047857', fontSize: '15px', fontWeight: '800' }}>
                    {step.title}
                  </div>
                  <div style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.65 }}>{step.description}</div>
                </article>
              ))}
            </div>

            {(diagnosisResult.actionGuidance || []).length > 0 && (
              <div style={{ marginTop: '22px', padding: '18px 20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>이번 결과의 행동 안내</strong>
                <ul style={{ margin: '10px 0 0', paddingLeft: '20px', color: '#475569', fontSize: '13px', lineHeight: 1.8 }}>
                  {diagnosisResult.actionGuidance.map((guidance) => <li key={guidance}>{guidance}</li>)}
                </ul>
              </div>
            )}

            <div className="care-flow-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
              {isEmergency ? (
                <button type="button" onClick={() => setIsEmergencyModalOpen(true)} className="btn btn-danger">
                  현재 위치로 응급 병원 조회
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => onNavigateTimeline?.(diagnosisResult)} className="btn btn-primary">
                    다음 경과 기록 준비하기
                  </button>
                  <button type="button" onClick={() => setIsEmergencyModalOpen(true)} className="btn btn-secondary">
                    현재 위치로 주변 병원 조회
                  </button>
                </>
              )}
            </div>
            {!isEmergency && (
              <p style={{ margin: '18px 0 0', color: '#9a3412', fontSize: '13px', lineHeight: 1.6 }}>
                증상이 악화되거나 새로운 위험 신호가 생기면 즉시 동물병원에 문의하세요.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

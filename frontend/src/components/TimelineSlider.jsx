import React, { useEffect, useState } from 'react';
import { diagnosisApi } from '../api/diagnosisApi';

const formatDate = (value) => {
  if (!value) return '기록 시각 없음';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

export default function TimelineSlider({ selectedPet, sourceDiagnosis, onNavigateDiagnosis }) {
  const [baselineImage, setBaselineImage] = useState('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (!sourceDiagnosis?.diagnosisId || !sourceDiagnosis?.imageUrl) {
      setBaselineImage('');
      setImageError('');
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    diagnosisApi.getDiagnosisImage(sourceDiagnosis.diagnosisId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setBaselineImage(objectUrl);
        setImageError('');
      })
      .catch((error) => {
        if (!active) return;
        setBaselineImage('');
        setImageError(error?.message || '기준 진단 Image를 불러오지 못했습니다.');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceDiagnosis?.diagnosisId, sourceDiagnosis?.imageUrl]);

  return (
    <section id="timeline-section" style={{ padding: '30px 0 80px', background: '#f8fafc' }}>
      <div className="container">
        <div className="glass-card" style={{ padding: '32px' }}>
          <span className="badge badge-indigo">DATA-DRIVEN TIMELINE</span>
          <h3 style={{ marginBottom: '10px' }}>실제 진단 기록을 기준으로 경과 비교를 준비합니다.</h3>

          {!sourceDiagnosis ? (
            <div style={{ padding: '24px', borderRadius: '14px', background: '#f8fafc', textAlign: 'center' }}>
              <p style={{ color: '#475569', lineHeight: 1.7 }}>
                고정 예시 Image·호전율·의료 조언은 표시하지 않습니다. 먼저 진단 페이지에서 저장된 실제 기록을 선택해 주세요.
              </p>
              <button type="button" onClick={onNavigateDiagnosis} className="btn btn-primary">
                진단 기록 선택하기
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '22px' }}>
              <article style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '16px', background: '#fff' }}>
                <strong>기준 진단 #{sourceDiagnosis.diagnosisId}</strong>
                <p style={{ color: '#475569', lineHeight: 1.7 }}>
                  {selectedPet?.name || '선택한 반려동물'} · {sourceDiagnosis.affectedArea}<br />
                  {formatDate(sourceDiagnosis.createdAt)} · {sourceDiagnosis.riskLabel}
                </p>
                {baselineImage ? (
                  <img
                    src={baselineImage}
                    alt={`${selectedPet?.name || '반려동물'}의 기준 진단 환부`}
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '12px', background: '#f8fafc' }}
                  />
                ) : (
                  <p role={imageError ? 'alert' : undefined} style={{ color: imageError ? '#b91c1c' : '#64748b' }}>
                    {imageError || '기준 진단 Image를 불러오는 중입니다.'}
                  </p>
                )}
              </article>

              <div style={{ padding: '20px', border: '1px dashed #94a3b8', borderRadius: '16px', background: '#fff' }}>
                <strong>다음 진단이 필요합니다.</strong>
                <p style={{ color: '#475569', lineHeight: 1.7 }}>
                  실제 Before/After 비교는 같은 반려동물·같은 환부의 저장된 진단 두 건과 Timeline API가 연결된 뒤 활성화됩니다.
                  그 전에는 호전율이나 AI 소견을 임의로 계산·저장하지 않습니다.
                </p>
                <button type="button" onClick={onNavigateDiagnosis} className="btn btn-secondary">
                  동일 환부 새 진단으로 이동
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

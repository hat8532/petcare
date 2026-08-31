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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '9999px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '800' }}>
            TIMELINE & BEFORE / AFTER
          </span>
          <h2 style={{ margin: '10px 0 6px', color: '#0f172a', fontSize: '30px', fontWeight: '900' }}>
            증상 변화 추이 타임라인
          </h2>
          <p style={{ margin: 0, color: '#475569', fontSize: '14.5px' }}>
            저장된 실제 진단을 기준점으로 삼고, 같은 환부의 다음 기록이 생기면 비교합니다.
          </p>
        </div>

        {!sourceDiagnosis ? (
          <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', padding: '44px 32px', textAlign: 'center' }}>
            <div
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '58px',
                height: '58px',
                margin: '0 auto 18px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #059669, #14b8a6)',
                color: '#ffffff',
                fontSize: '26px',
                fontWeight: '900',
                boxShadow: '0 12px 28px rgba(5, 150, 105, 0.22)'
              }}
            >
              ↔
            </div>
            <span className="badge badge-emerald">기준 기록 필요</span>
            <h3 style={{ margin: '14px 0 8px', color: '#0f172a', fontSize: '21px', fontWeight: '800' }}>
              먼저 비교할 진단 기록을 선택해 주세요.
            </h3>
            <p style={{ maxWidth: '620px', margin: '0 auto 22px', color: '#64748b', lineHeight: 1.75 }}>
              고정 예시 Image나 임의의 호전율은 표시하지 않습니다. 진단 결과에서 실제 기록을 선택하면
              해당 사진과 기록 시각이 Before 기준으로 연결됩니다.
            </p>
            <button type="button" onClick={onNavigateDiagnosis} className="btn btn-primary">
              진단 기록 선택하기
            </button>
          </div>
        ) : (
          <>
            <div
              className="glass-card"
              style={{
                padding: '32px',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: '32px',
                alignItems: 'stretch'
              }}
            >
              <article>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#ffe4e6', color: '#be123c', fontSize: '12px', fontWeight: '800' }}>
                    BEFORE · 기준 진단 #{sourceDiagnosis.diagnosisId}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '700' }}>
                    {formatDate(sourceDiagnosis.createdAt)}
                  </span>
                </div>

                <div style={{ minHeight: '320px', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '2px solid #e2e8f0', borderRadius: '20px', background: '#f8fafc', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}>
                  {baselineImage ? (
                    <img
                      src={baselineImage}
                      alt={`${selectedPet?.name || '반려동물'}의 기준 진단 환부`}
                      style={{ width: '100%', height: '320px', objectFit: 'contain', background: '#f8fafc' }}
                    />
                  ) : (
                    <p role={imageError ? 'alert' : 'status'} style={{ padding: '24px', color: imageError ? '#b91c1c' : '#64748b', textAlign: 'center', lineHeight: 1.7 }}>
                      {imageError || '기준 진단 Image를 불러오는 중입니다.'}
                    </p>
                  )}
                </div>
              </article>

              <article style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: '800' }}>
                    AFTER · 다음 기록
                  </span>
                  <span className="badge badge-indigo">비교 잠김</span>
                </div>

                <div style={{ flex: 1, minHeight: '320px', display: 'grid', placeItems: 'center', padding: '32px', border: '2px dashed #94a3b8', borderRadius: '20px', background: 'linear-gradient(145deg, #ffffff, #f8fafc)', textAlign: 'center' }}>
                  <div>
                    <div aria-hidden="true" style={{ marginBottom: '12px', color: '#94a3b8', fontSize: '32px', fontWeight: '900' }}>+</div>
                    <strong style={{ display: 'block', marginBottom: '8px', color: '#0f172a', fontSize: '17px' }}>
                      같은 환부의 다음 진단이 필요합니다.
                    </strong>
                    <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '13px', lineHeight: 1.7 }}>
                      두 번째 저장 기록과 Timeline API가 연결되면 실제 Before/After 비교가 활성화됩니다.
                    </p>
                    <button
                      type="button"
                      onClick={onNavigateDiagnosis}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '12px 14px', whiteSpace: 'normal' }}
                    >
                      동일 환부 새 진단으로 이동
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div className="glass-card" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <span className="badge badge-emerald">기준 기록 연결됨</span>
                  <h3 style={{ margin: '10px 0 4px', color: '#0f172a', fontSize: '19px', fontWeight: '800' }}>
                    {selectedPet?.name || '선택한 반려동물'} · {sourceDiagnosis.affectedArea || '환부 정보 없음'}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                    위험도 {sourceDiagnosis.riskLabel || sourceDiagnosis.riskLevel || '확인 필요'}
                  </p>
                </div>
                <span style={{ padding: '8px 12px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '700' }}>
                  저장된 실제 기록만 사용
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                {[
                  ['Before Image', '연결 완료', '#047857', '#ecfdf5'],
                  ['After Image', '다음 진단 필요', '#9a3412', '#fff7ed'],
                  ['비교 결과', '데이터 대기', '#4338ca', '#eef2ff']
                ].map(([label, value, color, background]) => (
                  <div key={label} style={{ padding: '16px', borderRadius: '14px', background, border: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', marginBottom: '5px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>{label}</span>
                    <strong style={{ color, fontSize: '14px' }}>{value}</strong>
                  </div>
                ))}
              </div>

              <p style={{ margin: '18px 0 0', color: '#64748b', fontSize: '12.5px', lineHeight: 1.7 }}>
                두 기록이 준비되기 전에는 호전율·악화율·AI 경과 소견을 임의로 계산하거나 저장하지 않습니다.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

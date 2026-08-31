import React from 'react';

export default function CareFlowBranch({ diagnosisResult, onNavigateTimeline, onNavigateHospital }) {
  const riskLevel = diagnosisResult?.riskLevel;
  const isEmergency = riskLevel === 'EMERGENCY';

  return (
    <section style={{ padding: '36px 0', background: '#f8fafc' }}>
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
                <button type="button" onClick={onNavigateHospital} className="btn btn-danger">
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

import React from 'react';

export default function DiagnosisEvaluation({ onOpenBenchmark }) {
  return (
    <div style={{ marginTop: '50px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '24px', padding: '36px', color: '#ffffff', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: '1 1 520px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #059669', color: '#34d399', fontSize: '12px', fontWeight: '800', marginBottom: '8px' }}>
            🔬 AI MODEL EVALUATION PLAN
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', margin: 0 }}>
            실제 Dataset 확보 후 <span style={{ color: '#34d399' }}>동일 Protocol로 성능 비교</span>
          </h3>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '6px' }}>
            승인된 Dataset·Model Artifact·Pet Group Split이 확보되기 전에는 정확도나 성능 수치를 게시하지 않습니다.
          </p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>현재 평가 상태</div>
          <div style={{ fontSize: '30px', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>평가 전</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          ['STEP 1. Dataset 검증', 'Source · License · Class', '사용 가능 범위와 품질 확인'],
          ['STEP 2. Split 고정', 'Pet Group Split', '동일 Pet의 평가 누수 차단'],
          ['STEP 3. 후보 비교', '동일 Metric · 동일 환경', 'Baseline과 후보 Model 분리 평가'],
          ['STEP 4. 안전성 평가', 'RAG 근거 · 위반률', 'Vision 성능과 Report 품질 분리']
        ].map(([step, title, descriptionText], index) => (
          <div key={step} style={{ background: index === 3 ? 'rgba(5, 150, 105, 0.15)' : 'rgba(255, 255, 255, 0.05)', border: index === 3 ? '1px solid #059669' : '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: index === 3 ? '#34d399' : '#94a3b8', fontWeight: '700' }}>{step}</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>{title}</div>
            <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '700', marginTop: '8px' }}>{descriptionText}</div>
          </div>
        ))}
      </div>

      <div className="diagnosis-evaluation-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '12px', color: '#94a3b8' }}>
        <span>📄 공개 수치는 재현 가능한 Evidence와 팀 승인 뒤에만 반영합니다.</span>
        <button type="button" onClick={onOpenBenchmark} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
          평가 기준 자세히 보기
        </button>
      </div>
    </div>
  );
}

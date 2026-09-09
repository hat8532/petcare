import React from 'react';

const ACTION_TITLES = Object.freeze({
  MONITOR_AND_RECORD: '집에서 경과 기록',
  ESCALATE_IF_WORSE: '악화 시 병원 문의',
  CONTACT_VET_SOON: '빠른 시일 내 병원 문의',
  AVOID_UNVERIFIED_TREATMENT: '임의 처치 금지',
  SEEK_EMERGENCY_VET_NOW: '즉시 응급 병원 연락·이동',
  FOLLOW_CLINIC_INSTRUCTIONS: '병원 안내 우선'
});

const riskBadgeClass = (riskLevel) => {
  if (riskLevel === 'EMERGENCY') return 'badge-rose';
  if (riskLevel === 'CAUTION') return 'badge-amber';
  return 'badge-emerald';
};

const formatDate = (value) => {
  if (!value) return '방금';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

export default function DiagnosisResult({
  affectedAreaOptions,
  analysisError,
  analysisResult,
  isAnalyzing,
  onNavigateTimeline,
  onOpenCareFlow,
  onOpenRetryGuidance,
  onPrint,
  resultImageUrl,
  selectedPet,
  storedImageError
}) {
  const findings = analysisResult?.visionTopDiseases || [];
  const ragSources = analysisResult?.ragSources || [];
  const isRagPrototype = analysisResult?.analysisMode === 'GEMINI_RAG_PROTOTYPE';

  return (
    <div id="diagnosis-print-report" className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: analysisResult ? 'flex-start' : 'center', minHeight: '640px' }} aria-live="polite">
      {isAnalyzing && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }} role="status">
          <div style={{ fontSize: '48px', marginBottom: '16px' }} className="animate-pulse-glow">🔍</div>
          <h4 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>환부 Image와 증상 분석 중</h4>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Image 형식·Provider 응답·Safety Triage를 순서대로 검증하고 있습니다.
          </p>
          <div style={{ width: '80%', height: '6px', background: '#e2e8f0', borderRadius: '3px', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ width: '70%', height: '100%', background: 'linear-gradient(90deg, #059669, #0891b2)', borderRadius: '3px' }} className="animate-pulse-glow" />
          </div>
        </div>
      )}

      {!analysisResult && !isAnalyzing && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ width: '84px', height: '84px', borderRadius: '26px', display: 'grid', placeItems: 'center', margin: '0 auto 18px', fontSize: '42px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #a7f3d0' }}>
            🩺
          </div>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>진단 결과를 기다리는 중</h4>
          <p style={{ fontSize: '13px', lineHeight: '1.7' }}>
            좌측 양식을 작성해 진단을 실행하거나<br />아래 이력에서 저장된 결과를 선택해 주세요.
          </p>
          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', marginTop: '18px', padding: '8px 14px', borderRadius: '9999px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
            <span style={{ color: '#059669' }}>●</span> 확정 진단·처방이 아닌 보조 안내
          </div>
          {analysisError && (
            <p role="alert" style={{ marginTop: '14px', color: '#dc2626', fontWeight: '700' }}>{analysisError}</p>
          )}
        </div>
      )}

      {analysisResult && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <span className={`badge ${riskBadgeClass(analysisResult.riskLevel)}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
              위험도: {analysisResult.riskLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>{formatDate(analysisResult.createdAt)}</span>
              <button type="button" onClick={onPrint} className="btn btn-secondary diagnosis-no-print" style={{ padding: '7px 12px', fontSize: '12px' }}>
                PDF 저장·인쇄
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
            {['GEMINI_MULTIMODAL', 'GEMINI_RAG_PROTOTYPE'].includes(analysisResult.analysisMode)
              ? 'AI Image 의심 소견 안내'
              : '진단 분석 결과 리포트'}
          </h3>

          <p style={{ marginBottom: '12px', color: '#64748b', fontSize: '12px', overflowWrap: 'anywhere' }}>
            진단 #{analysisResult.diagnosisId} · 반려동물 #{analysisResult.petId}
            {analysisResult.petId === selectedPet?.id && selectedPet.name ? ` (${selectedPet.name})` : ''}
            {' · 환부: '}{affectedAreaOptions.find(area => area.id === analysisResult.affectedArea)?.label || analysisResult.affectedArea}
          </p>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px', color: '#475569' }}>
            <strong>분석 Mode:</strong> {analysisResult.analysisMode || 'UNKNOWN'}
            {analysisResult.model && <span> · <strong>Model:</strong> {analysisResult.model} {analysisResult.modelVersion || ''}</span>}
            {isRagPrototype && (
              <div style={{ color: '#047857', marginTop: '6px', fontWeight: '700' }}>
                소규모 RAG Prototype · 검색된 수의학 자료 {ragSources.length}건을 참고한 안내입니다.
              </div>
            )}
            {analysisResult.failureCode && (
              <div style={{ color: '#b45309', marginTop: '6px' }}>
                <strong>Image 분석 상태:</strong> {analysisResult.failureCode}
                {onOpenRetryGuidance && (
                  <button
                    type="button"
                    onClick={onOpenRetryGuidance}
                    className="btn btn-secondary diagnosis-no-print"
                    style={{ marginLeft: '8px', padding: '4px 8px' }}
                  >
                    다시 시도 안내
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '700', marginBottom: '10px' }}>📸 저장된 환부 Image</div>
              {resultImageUrl ? (
                <img
                  src={resultImageUrl}
                  alt={`${selectedPet?.name || '반려동물'}의 진단 환부`}
                  style={{ width: '100%', height: '170px', objectFit: 'contain', borderRadius: '12px', background: '#ffffff' }}
                />
              ) : (
                <div style={{ height: '170px', display: 'grid', placeItems: 'center', padding: '12px', color: '#64748b', textAlign: 'center', fontSize: '12px' }}>
                  {storedImageError || '이 기록에는 다시 표시할 수 있는 보관 Image가 없습니다.'}
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '700', marginBottom: '12px' }}>📊 AI Image 의심 소견</div>
              {findings.length > 0 ? findings.map((finding, index) => {
                const probability = Math.max(0, Math.min(100, Number(finding.probability) || 0));
                return (
                  <div key={`${finding.diseaseName}-${finding.probability}`} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px', fontWeight: '700', marginBottom: '4px', color: '#0f172a' }}>
                      <span>{index + 1}. {finding.diseaseName}</span>
                      <span style={{ color: index === 0 ? '#059669' : '#64748b' }}>{probability}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${probability}%`, height: '100%', background: index === 0 ? 'linear-gradient(90deg, #059669, #0891b2)' : '#94a3b8', borderRadius: '4px' }} />
                    </div>
                    <small style={{ color: '#64748b' }}>Model confidence · 임상 확률 아님</small>
                  </div>
                );
              }) : (
                <div style={{ padding: '14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', color: '#9a3412', fontSize: '12px', lineHeight: 1.6 }}>
                  {analysisResult.failureCode
                    ? '검증된 Image 소견이 없습니다. 질환명이나 확률을 임의 생성하지 않았습니다.'
                    : '사진에서 명확히 구분할 수 있는 외형 소견을 확보하지 못했습니다. 이상이 없다는 뜻은 아닙니다.'}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1.5px solid #6ee7b7', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
            <div style={{ fontWeight: '800', color: '#047857', marginBottom: '10px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🤖</span>
              <span>증상 분석 리포트 & 안전 행동 가이드</span>
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: '13.5px', lineHeight: '1.7', color: '#064e3b' }}>
              {analysisResult.ragReport}
            </div>

            {ragSources.length > 0 && (
              <div style={{ display: 'grid', gap: '7px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #a7f3d0' }}>
                <strong style={{ color: '#047857', fontSize: '12.5px' }}>RAG 참고 출처</strong>
                {ragSources.map((source) => (
                  <a
                    key={source.sourceId}
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#0369a1', fontSize: '12px', lineHeight: 1.5, overflowWrap: 'anywhere' }}
                  >
                    [{source.sourceId}] {source.title} · {source.publisher}
                  </a>
                ))}
              </div>
            )}

            {(analysisResult.actionGuidance || []).length > 0 && (
              <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
                {analysisResult.actionGuidance.map((item, index) => {
                  const actionCode = analysisResult.actionCodes?.[index];
                  return (
                    <div key={`${actionCode || 'action'}-${item}`} style={{ padding: '10px 12px', border: '1px solid #a7f3d0', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.72)' }}>
                      <strong style={{ display: 'block', color: '#047857', fontSize: '12.5px' }}>
                        {ACTION_TITLES[actionCode] || `권장 행동 ${index + 1}`}
                      </strong>
                      <span style={{ display: 'block', marginTop: '3px', color: '#475569', fontSize: '12.5px' }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(analysisResult.limitations || []).length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '12px' }}>
              {analysisResult.limitations.map((item) => <div key={item}>제한: {item}</div>)}
            </div>
          )}

          <div className="diagnosis-no-print diagnosis-result-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {analysisResult.riskLevel === 'EMERGENCY' ? (
              <button type="button" onClick={() => onOpenCareFlow?.(analysisResult)} className="btn btn-danger" style={{ flex: 1, padding: '14px 20px' }}>
                🚨 현재 위치로 검증 응급 병원 조회
              </button>
            ) : (
              <>
                <button type="button" onClick={() => onNavigateTimeline?.(analysisResult)} className="btn btn-primary" style={{ flex: 1, padding: '14px 18px' }}>
                  📅 다음 경과 기록 준비하기
                </button>
                <button type="button" onClick={() => onOpenCareFlow?.(analysisResult)} className="btn btn-secondary" style={{ padding: '14px 18px' }}>🏥 현재 위치로 검증 병원 조회</button>
              </>
            )}
          </div>
          {analysisResult.riskLevel !== 'EMERGENCY' && (
            <p style={{ marginBottom: 0, color: '#9a3412', fontSize: '12px' }}>
              상태가 악화되거나 새로운 위험 신호가 생기면 즉시 동물병원에 문의하세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

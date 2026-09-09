import React from 'react';

const formatDate = (value) => {
  if (!value) return '방금';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

export default function DiagnosisHistory({
  activeDiagnosisId,
  history,
  historyError,
  historyMeta,
  historyPage,
  isHistoryLoading,
  onLoadPage,
  onSelectDiagnosis
}) {
  return (
    <div className="glass-card" style={{ padding: '28px', marginTop: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '20px' }}>🗂️</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>과거 진단 이력</h3>
            <span style={{ color: '#64748b', fontSize: '12px' }}>총 {historyMeta.totalElements}건</span>
          </div>
        </div>
        <button type="button" onClick={() => onLoadPage(historyPage)} disabled={isHistoryLoading} className="btn btn-secondary">
          {isHistoryLoading ? '불러오는 중…' : '새로고침'}
        </button>
      </div>
      {historyError && <p role="alert" style={{ color: '#dc2626' }}>{historyError}</p>}
      {!historyError && !isHistoryLoading && history.length === 0 && <p style={{ color: '#64748b' }}>저장된 진단 이력이 없습니다.</p>}
      <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
        {history.map((record) => (
          <button
            key={record.diagnosisId}
            type="button"
            aria-pressed={activeDiagnosisId === record.diagnosisId}
            onClick={() => onSelectDiagnosis(record.diagnosisId)}
            style={{
              padding: '14px 16px',
              border: activeDiagnosisId === record.diagnosisId ? '2px solid #10b981' : '1px solid #e2e8f0',
              borderRadius: '14px',
              background: activeDiagnosisId === record.diagnosisId ? '#ecfdf5' : '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            <strong>#{record.diagnosisId} · {record.riskLabel}</strong>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
              {record.affectedArea} · {formatDate(record.createdAt)} · {record.analysisMode || 'UNKNOWN'}
            </div>
          </button>
        ))}
      </div>
      {historyMeta.totalPages > 1 && (
        <nav aria-label="진단 이력 페이지" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => onLoadPage(historyPage - 1)}
            disabled={isHistoryLoading || historyPage === 0}
            className="btn btn-secondary"
          >
            이전
          </button>
          <span aria-live="polite">{historyPage + 1} / {historyMeta.totalPages} page</span>
          <button
            type="button"
            onClick={() => onLoadPage(historyPage + 1)}
            disabled={isHistoryLoading || historyPage + 1 >= historyMeta.totalPages}
            className="btn btn-secondary"
          >
            다음
          </button>
        </nav>
      )}
    </div>
  );
}

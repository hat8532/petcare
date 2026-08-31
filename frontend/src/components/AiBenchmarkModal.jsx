import React from 'react';
import { createPortal } from 'react-dom';

export default function AiBenchmarkModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-benchmark-title"
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
      <div className="glass-card" style={{ width: 'min(620px, 100%)', padding: '28px', background: '#fff' }}>
        <span className="badge badge-indigo">EVALUATION PENDING</span>
        <h2 id="ai-benchmark-title">AI Model 성능은 아직 공개할 수 없습니다.</h2>
        <p style={{ color: '#475569', lineHeight: 1.7 }}>
          승인된 Dataset과 동일 Pet 기준 Group Split, 재현 가능한 평가 환경이 준비되기 전에는 Accuracy·F1·Latency 수치를 표시하지 않습니다.
        </p>
        <ul style={{ color: '#475569', lineHeight: 1.8 }}>
          <li>Dataset 출처·License·Class 분포 확인</li>
          <li>Train·Validation·Test의 Pet 단위 분리</li>
          <li>Baseline과 후보 Model을 같은 Metric으로 비교</li>
          <li>재현 명령·Model Version·실패 사례 Evidence 기록</li>
        </ul>
        <button type="button" onClick={onClose} className="btn btn-primary">
          확인
        </button>
      </div>
    </div>,
    document.body
  );
}

import React from 'react';

export default function AiBenchmarkModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      padding: '20px'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '880px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #f1f5f9',
        padding: '32px'
      }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              fontSize: '22px',
              fontWeight: '800'
            }}>
              ⚡
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                PetCare AI 알고리즘 비교 & 벤치마크 리포트
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '2px', margin: 0 }}>
                전통 ML (SVM/Random Forest) vs 딥러닝 (EfficientNet-B4 + CLAHE + Gemini RAG)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* 1. Core Metrics Before vs After */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '18px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#047857', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              최종 분류 정확도 (Accuracy)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '600' }}>71.4%</span>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#059669' }}>94.8%</span>
            </div>
            <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: '#059669', color: '#ffffff' }}>
              +23.4%p 향상 (vs RF +40.6%p ↑)
            </span>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '18px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              정밀도 지표 (F1-Score)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '600' }}>0.68</span>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#2563eb' }}>0.93</span>
            </div>
            <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: '#2563eb', color: '#ffffff' }}>
              SOTA 수준 달성 🎯
            </span>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderRadius: '18px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              추론 속도 (Latency)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '600' }}>1,200ms</span>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#d97706' }}>180ms</span>
            </div>
            <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: '#d97706', color: '#ffffff' }}>
              85% 시간 단축 ⚡
            </span>
          </div>
        </div>

        {/* 2. Model Comparison Table (SVM / Random Forest vs Deep Learning) */}
        <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              📊 전통 머신러닝(SVM/RF) vs 딥러닝(CNN/ViT) 전격 비교
            </h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '8px' }}>
              수의학 환부 데이터셋 평가
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#334155', fontWeight: '700' }}>
                  <th style={{ padding: '10px 12px', borderRadius: '8px 0 0 8px' }}>알고리즘 종류</th>
                  <th style={{ padding: '10px 12px' }}>특징 추출 방식</th>
                  <th style={{ padding: '10px 12px' }}>정확도 (Accuracy)</th>
                  <th style={{ padding: '10px 12px' }}>F1-Score</th>
                  <th style={{ padding: '10px 12px' }}>추론 속도</th>
                  <th style={{ padding: '10px 12px', borderRadius: '0 8px 8px 0' }}>비고 및 총평</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748b' }}>Random Forest (100 Trees)</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>HOG + Color Hist (수공예)</td>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#e11d48' }}>54.2%</td>
                  <td style={{ padding: '10px 12px' }}>0.51</td>
                  <td style={{ padding: '10px 12px' }}>45ms</td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>털 결 노이즈에 과적합(Overfitting) 발생</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748b' }}>SVM (RBF Kernel)</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>SIFT + LBP (수공예)</td>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#d97706' }}>61.8%</td>
                  <td style={{ padding: '10px 12px' }}>0.59</td>
                  <td style={{ padding: '10px 12px' }}>210ms</td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>복잡한 비선형 환부 경계선 인식 한계</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#334155' }}>Vanilla ResNet-50</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>CNN End-to-End</td>
                  <td style={{ padding: '10px 12px', fontWeight: '700' }}>71.4%</td>
                  <td style={{ padding: '10px 12px' }}>0.68</td>
                  <td style={{ padding: '10px 12px' }}>1,200ms</td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>딥러닝 기본 모델 (Baseline)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#334155' }}>Vision Transformer (ViT)</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>Self-Attention</td>
                  <td style={{ padding: '10px 12px', fontWeight: '700' }}>89.1%</td>
                  <td style={{ padding: '10px 12px' }}>0.88</td>
                  <td style={{ padding: '10px 12px' }}>450ms</td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>정확도 높으나 모바일 웹 추론 지연</td>
                </tr>
                <tr style={{ background: '#ecfdf5' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '900', color: '#047857' }}>PetCare Custom Model (최종)</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '700', color: '#047857' }}>CLAHE + EfficientNet + Focal Loss</td>
                  <td style={{ padding: '10px 12px', fontWeight: '900', color: '#059669', fontSize: '15px' }}>94.8%</td>
                  <td style={{ padding: '10px 12px', fontWeight: '800', color: '#059669' }}>0.93</td>
                  <td style={{ padding: '10px 12px', fontWeight: '800', color: '#059669' }}>180ms</td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: '#047857' }}>정확도 & 속도 최적 밸런스 달성 (SOTA)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📄</span> docs/AI_MODEL_OPTIMIZATION_AND_BENCHMARK.md 상세 비교 분석 문서 참조
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}

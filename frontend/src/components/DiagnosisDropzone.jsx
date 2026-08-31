import React, { useCallback, useEffect, useRef, useState } from 'react';
import { diagnosisApi } from '../api/diagnosisApi';

const AREA_OPTIONS = [
  { id: 'SKIN', label: '피부/모피' },
  { id: 'EYE', label: '안구/눈' },
  { id: 'EAR', label: '귀/귓바퀴' },
  { id: 'MOUTH', label: '구강/치아' },
  { id: 'PAW_LIMB', label: '발/관절' },
  { id: 'NOSE_RESPIRATORY', label: '코/호흡기' },
  { id: 'ABDOMEN', label: '배/소화기' },
  { id: 'CUSTOM', label: '직접 입력' }
];

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

export default function DiagnosisDropzone({
  selectedPet,
  onNavigateTimeline,
  onNavigateHospital,
  onDiagnosisResult
}) {
  const [affectedArea, setAffectedArea] = useState('SKIN');
  const [customAreaText, setCustomAreaText] = useState('');
  const [symptomOptions, setSymptomOptions] = useState({});
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    diagnosisApi.getSymptoms()
      .then((options) => {
        if (active) setSymptomOptions(options || {});
      })
      .catch((error) => {
        if (active) setAnalysisError(error?.message || '증상 선택지를 불러오지 못했습니다.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const loadHistory = useCallback(async () => {
    if (!selectedPet?.id) {
      setHistory([]);
      setHistoryError('');
      return;
    }

    try {
      const records = await diagnosisApi.getHistoryByPet(selectedPet.id);
      setHistory(records);
      setHistoryError('');
    } catch (error) {
      setHistory([]);
      setHistoryError(error?.message || '과거 진단 이력을 불러오지 못했습니다.');
    }
  }, [selectedPet?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const selectImage = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAnalysisError('JPEG, PNG 또는 WEBP Image만 선택할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAnalysisError('Image File은 10MB 이하만 선택할 수 있습니다.');
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAnalysisError('');
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((current) => current.includes(symptom)
      ? current.filter((item) => item !== symptom)
      : [...current, symptom]);
  };

  const handleRunDiagnosis = async () => {
    if (!selectedPet?.id) {
      setAnalysisError('먼저 진단할 반려동물을 선택해 주세요.');
      return;
    }
    if (!imageFile || selectedSymptoms.length === 0 || !description.trim()) {
      setAnalysisError('환부 Image, 증상 한 개 이상, 상세 설명을 모두 입력해 주세요.');
      return;
    }
    if (affectedArea === 'CUSTOM' && !customAreaText.trim()) {
      setAnalysisError('직접 입력한 환부 이름을 작성해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError('');

    try {
      const result = await diagnosisApi.analyze({
        petId: selectedPet.id,
        petName: selectedPet.name || '반려동물',
        petSpecies: selectedPet.species || 'UNKNOWN',
        affectedArea,
        customAreaText,
        symptoms: selectedSymptoms,
        description: description.trim(),
        healthProfile: selectedPet.healthProfile
      }, imageFile);

      setAnalysisResult(result);
      onDiagnosisResult?.(result);
      await loadHistory();
    } catch (error) {
      setAnalysisError(error?.message || '진단 API 요청에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showStoredDiagnosis = async (diagnosisId) => {
    try {
      const result = await diagnosisApi.getDiagnosis(diagnosisId);
      setAnalysisResult(result);
      setAnalysisError('');
      onDiagnosisResult?.(result);
    } catch (error) {
      setAnalysisError(error?.message || '저장된 진단 결과를 불러오지 못했습니다.');
    }
  };

  const canAnalyze = Boolean(
    selectedPet?.id
    && imageFile
    && selectedSymptoms.length > 0
    && description.trim()
    && (affectedArea !== 'CUSTOM' || customAreaText.trim())
  );
  const findings = analysisResult?.visionTopDiseases || [];

  return (
    <section id="diagnosis-section" style={{ padding: '60px 0', background: '#fff' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span className="badge badge-emerald">AI DIAGNOSIS PIPELINE</span>
          <h2>반려동물 AI 질병 진단</h2>
          <p>환부 Image와 증상을 분석하되, 결과를 확정 진단이나 처방으로 표시하지 않습니다.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ marginTop: 0 }}>진단 입력</h3>

            <div style={{ padding: '12px', marginBottom: '18px', borderRadius: '12px', background: selectedPet ? '#ecfdf5' : '#fff7ed' }}>
              <strong>{selectedPet?.name || '반려동물 미선택'}</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {selectedPet ? `${selectedPet.species || '종 미지정'} · ${selectedPet.breed || '품종 미지정'}` : '등록된 반려동물을 먼저 선택해 주세요.'}
              </div>
            </div>

            <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>1. 환부 선택</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {AREA_OPTIONS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    setAffectedArea(area.id);
                    setSelectedSymptoms([]);
                  }}
                  style={{
                    padding: '9px 4px',
                    borderRadius: '10px',
                    border: affectedArea === area.id ? '2px solid #10b981' : '1px solid #cbd5e1',
                    background: affectedArea === area.id ? '#ecfdf5' : '#fff',
                    color: affectedArea === area.id ? '#047857' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {area.label}
                </button>
              ))}
            </div>
            {affectedArea === 'CUSTOM' && (
              <input
                value={customAreaText}
                onChange={(event) => setCustomAreaText(event.target.value)}
                maxLength={100}
                placeholder="환부 이름을 입력해 주세요."
                style={{ width: '100%', padding: '10px', marginBottom: '12px' }}
              />
            )}

            <label style={{ display: 'block', fontWeight: 700, margin: '16px 0 8px' }}>2. 증상 선택</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '34px' }}>
              {(symptomOptions[affectedArea] || []).map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: selectedSymptoms.includes(symptom) ? '1px solid #059669' : '1px solid #cbd5e1',
                    background: selectedSymptoms.includes(symptom) ? '#ecfdf5' : '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  {selectedSymptoms.includes(symptom) ? '✓ ' : '+ '}{symptom}
                </button>
              ))}
              {!symptomOptions[affectedArea] && <span style={{ color: '#64748b', fontSize: '13px' }}>증상 선택지를 불러오는 중입니다.</span>}
            </div>

            <label style={{ display: 'block', fontWeight: 700, margin: '16px 0 8px' }}>3. 환부 Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => selectImage(event.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                selectImage(event.dataTransfer.files?.[0]);
              }}
              style={{ padding: '14px', border: '2px dashed #cbd5e1', borderRadius: '14px', textAlign: 'center', cursor: 'pointer' }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="선택한 환부" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px' }} />
              ) : (
                <div style={{ padding: '48px 10px', color: '#64748b' }}>JPEG·PNG·WEBP, 최대 10MB</div>
              )}
              <div style={{ marginTop: '8px', fontSize: '13px' }}>{imageFile?.name || '클릭하거나 Image를 끌어 놓으세요.'}</div>
            </div>
            {imageFile && <button type="button" onClick={clearImage} className="btn btn-secondary" style={{ marginTop: '8px' }}>Image 제거</button>}

            <label style={{ display: 'block', fontWeight: 700, margin: '16px 0 8px' }}>4. 상세 증상 설명</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="언제부터, 얼마나 자주, 어떤 변화가 있었는지 작성해 주세요."
              style={{ width: '100%', padding: '10px', resize: 'vertical' }}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>{description.length}/2000</div>

            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={isAnalyzing || !canAnalyze}
              className="btn-diagnosis-glow"
              style={{ marginTop: '12px' }}
            >
              {isAnalyzing ? 'Image와 증상 분석 중…' : 'AI 질병 진단 실행하기'}
            </button>
            {analysisError && <p role="alert" style={{ color: '#dc2626', fontWeight: 700 }}>{analysisError}</p>}
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ marginTop: 0 }}>진단 결과</h3>
            {!analysisResult && !isAnalyzing && <p style={{ color: '#64748b' }}>진단을 실행하거나 아래 이력에서 결과를 선택해 주세요.</p>}
            {isAnalyzing && <p>Provider 응답과 Safety Triage를 검증하고 있습니다.</p>}

            {analysisResult && (
              <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <span className={`badge ${riskBadgeClass(analysisResult.riskLevel)}`}>
                    {analysisResult.riskLabel}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{formatDate(analysisResult.createdAt)}</span>
                </div>

                <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}>
                  <strong>Mode:</strong> {analysisResult.analysisMode || 'UNKNOWN'}
                  {analysisResult.model && <span> · <strong>Model:</strong> {analysisResult.model} {analysisResult.modelVersion || ''}</span>}
                  {analysisResult.failureCode && <div style={{ color: '#b45309', marginTop: '4px' }}>상태: {analysisResult.failureCode}</div>}
                </div>

                <h4>AI 이미지 의심 소견</h4>
                {findings.length > 0 ? findings.map((finding) => (
                  <div key={`${finding.diseaseName}-${finding.probability}`} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <span>{finding.diseaseName}</span>
                      <strong>{finding.probability}%</strong>
                    </div>
                    <small style={{ color: '#64748b' }}>Model confidence이며 임상 확률이 아닙니다.</small>
                  </div>
                )) : (
                  <p style={{ padding: '12px', background: '#fff7ed', borderRadius: '10px' }}>
                    검증된 Image 소견이 없습니다. 질환명이나 확률을 임의 생성하지 않았습니다.
                  </p>
                )}

                <div style={{ whiteSpace: 'pre-line', padding: '16px', background: '#f0fdf4', borderRadius: '12px', lineHeight: 1.7 }}>
                  {analysisResult.ragReport}
                </div>

                {(analysisResult.actionGuidance || []).length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <strong>다음 행동</strong>
                    <ul>{analysisResult.actionGuidance.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
                {(analysisResult.limitations || []).length > 0 && (
                  <div style={{ marginTop: '14px', color: '#64748b', fontSize: '12px' }}>
                    {analysisResult.limitations.map((item) => <div key={item}>제한: {item}</div>)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  {analysisResult.riskLevel === 'EMERGENCY' ? (
                    <button type="button" onClick={onNavigateHospital} className="btn btn-danger" style={{ flex: 1 }}>
                      주변 응급 동물병원 찾기
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => onNavigateTimeline?.(analysisResult)} className="btn btn-primary" style={{ flex: 1 }}>
                        경과 관찰로 이동
                      </button>
                      <button type="button" onClick={onNavigateHospital} className="btn btn-secondary">주변 병원</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', marginTop: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>과거 진단 이력</h3>
            <button type="button" onClick={loadHistory} className="btn btn-secondary">새로고침</button>
          </div>
          {historyError && <p role="alert" style={{ color: '#dc2626' }}>{historyError}</p>}
          {!historyError && history.length === 0 && <p style={{ color: '#64748b' }}>저장된 진단 이력이 없습니다.</p>}
          <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
            {history.map((record) => (
              <button
                key={record.diagnosisId}
                type="button"
                onClick={() => showStoredDiagnosis(record.diagnosisId)}
                style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', textAlign: 'left', cursor: 'pointer' }}
              >
                <strong>#{record.diagnosisId} · {record.riskLabel}</strong>
                <div style={{ marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                  {record.affectedArea} · {formatDate(record.createdAt)} · {record.analysisMode || 'UNKNOWN'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '28px', padding: '24px', borderRadius: '18px', background: '#0f172a', color: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>AI Model 평가 상태: 평가 전</h3>
          <p style={{ marginBottom: 0, color: '#cbd5e1' }}>
            승인된 Dataset·동일 Pet Group Split·재현 가능한 Metric이 확보되기 전에는 정확도나 성능 수치를 게시하지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
}

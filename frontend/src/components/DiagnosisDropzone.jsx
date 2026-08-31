import React, { useCallback, useEffect, useRef, useState } from 'react';
import { diagnosisApi } from '../api/diagnosisApi';
import DiagnosisFailureDialog from './DiagnosisFailureDialog';

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

const HISTORY_PAGE_SIZE = 5;
const RETRYABLE_FAILURE_CODES = new Set([
  'INFERENCE_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_MODEL_UNAVAILABLE',
  'INVALID_PROVIDER_RESPONSE'
]);

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

export default function DiagnosisDropzone({
  selectedPet,
  pets = [],
  isAuthenticated = false,
  onSelectPet,
  onOpenLogin,
  onOpenPetManagement,
  onNavigateTimeline,
  onOpenCareFlow,
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
  const [analysisFailure, setAnalysisFailure] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyMeta, setHistoryMeta] = useState({ totalElements: 0, totalPages: 0 });
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [previewDiagnosisId, setPreviewDiagnosisId] = useState(null);
  const [storedImagePreview, setStoredImagePreview] = useState('');
  const [storedImageError, setStoredImageError] = useState('');
  const fileInputRef = useRef(null);
  const closeAnalysisFailure = useCallback(() => setAnalysisFailure(null), []);

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

  useEffect(() => {
    if (!analysisResult?.diagnosisId || !analysisResult?.imageUrl) {
      setStoredImagePreview('');
      setStoredImageError('');
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    diagnosisApi.getDiagnosisImage(analysisResult.diagnosisId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setStoredImagePreview(objectUrl);
        setStoredImageError('');
      })
      .catch((error) => {
        if (!active) return;
        setStoredImagePreview('');
        setStoredImageError(error?.message || '저장된 진단 Image를 불러오지 못했습니다.');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [analysisResult?.diagnosisId, analysisResult?.imageUrl]);

  const loadHistory = useCallback(async (page = 0) => {
    if (!selectedPet?.id) {
      setHistory([]);
      setHistoryError('');
      setHistoryMeta({ totalElements: 0, totalPages: 0 });
      return;
    }

    setIsHistoryLoading(true);
    try {
      const resultPage = await diagnosisApi.getHistoryByPet(selectedPet.id, page, HISTORY_PAGE_SIZE);
      setHistory(resultPage.content);
      setHistoryPage(resultPage.page);
      setHistoryMeta({
        totalElements: resultPage.totalElements,
        totalPages: resultPage.totalPages
      });
      setHistoryError('');
    } catch (error) {
      setHistory([]);
      setHistoryError(error?.message || '과거 진단 이력을 불러오지 못했습니다.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedPet?.id]);

  useEffect(() => {
    setHistoryPage(0);
    loadHistory(0);
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
    setAnalysisFailure(null);
    setPreviewDiagnosisId(null);

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
      setPreviewDiagnosisId(result.diagnosisId);
      onDiagnosisResult?.(result);
      await loadHistory(0);
      // 응급 분기에서는 Emergency modal을 우선해 두 개의 focus trap이 동시에 열리지 않게 한다.
      if (result.riskLevel !== 'EMERGENCY' && result.failureCode) {
        setAnalysisFailure({
          code: result.failureCode,
          message: '외부 Image 분석 Provider 응답을 검증하지 못해 입력 기반 Safety Triage만 저장했습니다.',
          canRetry: RETRYABLE_FAILURE_CODES.has(result.failureCode)
        });
      }
    } catch (error) {
      const message = error?.message || '진단 API 요청에 실패했습니다.';
      setAnalysisError(message);
      setAnalysisFailure({
        code: error?.responseBody?.failureCode || (error?.status ? `HTTP_${error.status}` : 'NETWORK_ERROR'),
        message,
        canRetry: !error?.status || error.status >= 500
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showStoredDiagnosis = async (diagnosisId) => {
    try {
      const result = await diagnosisApi.getDiagnosis(diagnosisId);
      setAnalysisResult(result);
      setAnalysisError('');
      setAnalysisFailure(null);
      setPreviewDiagnosisId(null);
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
  const resultImageUrl = storedImagePreview
    || (analysisResult?.diagnosisId === previewDiagnosisId ? imagePreview : '');

  const printDiagnosisReport = () => {
    window.print();
  };

  return (
    <section id="diagnosis-section" style={{ padding: '60px 0', background: '#fff' }}>
      <DiagnosisFailureDialog
        failure={analysisFailure}
        isRetrying={isAnalyzing}
        onRetry={handleRunDiagnosis}
        onClose={closeAnalysisFailure}
      />
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #diagnosis-print-report, #diagnosis-print-report * { visibility: visible !important; }
          #diagnosis-print-report {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          .diagnosis-no-print { display: none !important; }
        }
      `}</style>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span className="badge badge-emerald">AI DIAGNOSIS PIPELINE</span>
          <h2>반려동물 AI 질병 진단</h2>
          <p>환부 Image와 증상을 분석하되, 결과를 확정 진단이나 처방으로 표시하지 않습니다.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ marginTop: 0 }}>진단 입력</h3>

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
              <legend style={{ display: 'block', width: '100%', fontWeight: 700, marginBottom: '8px' }}>
                0. 등록된 반려동물 선택
              </legend>
              {pets.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {pets.map((pet) => {
                    const isSelected = selectedPet?.id === pet.id;
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectPet?.(pet)}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                          background: isSelected ? '#ecfdf5' : '#fff',
                          color: '#0f172a',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <strong>{pet.icon || '🐾'} {pet.name}</strong>
                        <span style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                          {pet.species || '종 미지정'} · {pet.breed || '품종 미지정'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '14px', borderRadius: '12px', background: '#fff7ed' }}>
                  <p style={{ margin: '0 0 10px', color: '#9a3412' }}>
                    {isAuthenticated ? '진단할 반려동물을 먼저 등록해 주세요.' : '로그인 후 등록된 반려동물을 선택할 수 있습니다.'}
                  </p>
                  <button
                    type="button"
                    onClick={isAuthenticated ? onOpenPetManagement : onOpenLogin}
                    className="btn btn-secondary"
                  >
                    {isAuthenticated ? '반려동물 등록으로 이동' : '로그인하기'}
                  </button>
                </div>
              )}
            </fieldset>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ display: 'block', width: '100%', fontWeight: 700, marginBottom: '8px' }}>1. 환부 선택</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {AREA_OPTIONS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  aria-pressed={affectedArea === area.id}
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
            </fieldset>
            {affectedArea === 'CUSTOM' && (
              <label style={{ display: 'block' }}>
                <span className="sr-only">직접 입력한 환부 이름</span>
                <input
                  value={customAreaText}
                  onChange={(event) => setCustomAreaText(event.target.value)}
                  maxLength={100}
                  placeholder="환부 이름을 입력해 주세요."
                  style={{ width: '100%', padding: '10px', marginBottom: '12px' }}
                />
              </label>
            )}

            <fieldset style={{ border: 0, padding: 0, margin: '16px 0 0' }}>
              <legend style={{ display: 'block', width: '100%', fontWeight: 700, marginBottom: '8px' }}>2. 증상 선택</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '34px' }}>
              {(symptomOptions[affectedArea] || []).map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  aria-pressed={selectedSymptoms.includes(symptom)}
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
            </fieldset>

            <label htmlFor="diagnosis-image" style={{ display: 'block', fontWeight: 700, margin: '16px 0 8px' }}>3. 환부 Image</label>
            <input
              id="diagnosis-image"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => selectImage(event.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="환부 Image 선택 또는 끌어 놓기"
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

            <label htmlFor="diagnosis-description" style={{ display: 'block', fontWeight: 700, margin: '16px 0 8px' }}>4. 상세 증상 설명</label>
            <textarea
              id="diagnosis-description"
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
              aria-busy={isAnalyzing}
              className="btn-diagnosis-glow"
              style={{ marginTop: '12px' }}
            >
              {isAnalyzing ? 'Image와 증상 분석 중…' : 'AI 질병 진단 실행하기'}
            </button>
            <div aria-live="polite" aria-atomic="true">
              {analysisError && <p role="alert" style={{ color: '#dc2626', fontWeight: 700 }}>{analysisError}</p>}
            </div>
          </div>

          <div id="diagnosis-print-report" className="glass-card" style={{ padding: '28px' }} aria-live="polite">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>진단 결과</h3>
              {analysisResult && (
                <button type="button" onClick={printDiagnosisReport} className="btn btn-secondary diagnosis-no-print">
                  PDF 저장·인쇄
                </button>
              )}
            </div>
            {!analysisResult && !isAnalyzing && <p style={{ color: '#64748b' }}>진단을 실행하거나 아래 이력에서 결과를 선택해 주세요.</p>}
            {isAnalyzing && <p role="status">Provider 응답과 Safety Triage를 검증하고 있습니다.</p>}

            {analysisResult && (
              <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <span className={`badge ${riskBadgeClass(analysisResult.riskLevel)}`}>
                    {analysisResult.riskLabel}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{formatDate(analysisResult.createdAt)}</span>
                </div>

                <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}>
                  <strong>분석 Mode:</strong> {analysisResult.analysisMode || 'UNKNOWN'}
                  {analysisResult.model && <span> · <strong>Model:</strong> {analysisResult.model} {analysisResult.modelVersion || ''}</span>}
                  {analysisResult.failureCode && (
                    <div style={{ color: '#b45309', marginTop: '4px' }}>
                      Image 분석 상태: {analysisResult.failureCode}
                      {RETRYABLE_FAILURE_CODES.has(analysisResult.failureCode) && (
                        <button
                          type="button"
                          onClick={() => setAnalysisFailure({
                            code: analysisResult.failureCode,
                            message: '외부 Image 분석 Provider 응답을 검증하지 못했습니다.',
                            canRetry: Boolean(imageFile)
                          })}
                          className="btn btn-secondary diagnosis-no-print"
                          style={{ marginLeft: '8px', padding: '4px 8px' }}
                        >
                          다시 시도 안내
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h4>환부 Image</h4>
                {resultImageUrl ? (
                  <img
                    src={resultImageUrl}
                    alt={`${selectedPet?.name || '반려동물'}의 진단 환부`}
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '12px', background: '#f8fafc' }}
                  />
                ) : (
                  <p style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                    {storedImageError || '이 기록에는 다시 표시할 수 있는 보관 Image 주소가 없습니다.'}
                  </p>
                )}

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
                    <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                      {analysisResult.actionGuidance.map((item, index) => {
                        const actionCode = analysisResult.actionCodes?.[index];
                        return (
                          <div key={`${actionCode || 'action'}-${item}`} style={{ padding: '12px', border: '1px solid #d1fae5', borderRadius: '10px', background: '#f0fdf4' }}>
                            <strong style={{ display: 'block', color: '#047857' }}>
                              {ACTION_TITLES[actionCode] || `권장 행동 ${index + 1}`}
                            </strong>
                            <span style={{ display: 'block', marginTop: '4px', color: '#475569' }}>{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(analysisResult.limitations || []).length > 0 && (
                  <div style={{ marginTop: '14px', color: '#64748b', fontSize: '12px' }}>
                    {analysisResult.limitations.map((item) => <div key={item}>제한: {item}</div>)}
                  </div>
                )}

                <div className="diagnosis-no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
                  {analysisResult.riskLevel === 'EMERGENCY' ? (
                    <button type="button" onClick={() => onOpenCareFlow?.(analysisResult)} className="btn btn-danger" style={{ flex: 1 }}>
                      현재 위치로 검증 응급 병원 조회
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => onNavigateTimeline?.(analysisResult)} className="btn btn-primary" style={{ flex: 1 }}>
                        3일 뒤 경과 기록하기
                      </button>
                      <button type="button" onClick={() => onOpenCareFlow?.(analysisResult)} className="btn btn-secondary">현재 위치로 검증 병원 조회</button>
                    </>
                  )}
                </div>
                {analysisResult.riskLevel !== 'EMERGENCY' && (
                  <p style={{ marginBottom: 0, color: '#9a3412', fontSize: '12px' }}>
                    상태가 악화되면 3일을 기다리지 말고 동물병원에 문의하세요.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', marginTop: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>과거 진단 이력</h3>
              <span style={{ color: '#64748b', fontSize: '12px' }}>총 {historyMeta.totalElements}건</span>
            </div>
            <button type="button" onClick={() => loadHistory(historyPage)} disabled={isHistoryLoading} className="btn btn-secondary">
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
                aria-pressed={analysisResult?.diagnosisId === record.diagnosisId}
                onClick={() => showStoredDiagnosis(record.diagnosisId)}
                style={{
                  padding: '12px',
                  border: analysisResult?.diagnosisId === record.diagnosisId ? '2px solid #10b981' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: analysisResult?.diagnosisId === record.diagnosisId ? '#ecfdf5' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer'
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
                onClick={() => loadHistory(historyPage - 1)}
                disabled={isHistoryLoading || historyPage === 0}
                className="btn btn-secondary"
              >
                이전
              </button>
              <span aria-live="polite">{historyPage + 1} / {historyMeta.totalPages} page</span>
              <button
                type="button"
                onClick={() => loadHistory(historyPage + 1)}
                disabled={isHistoryLoading || historyPage + 1 >= historyMeta.totalPages}
                className="btn btn-secondary"
              >
                다음
              </button>
            </nav>
          )}
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

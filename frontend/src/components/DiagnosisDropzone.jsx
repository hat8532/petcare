import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { diagnosisApi } from '../api/diagnosisApi';
import AiBenchmarkModal from './AiBenchmarkModal';
import DiagnosisFailureDialog from './DiagnosisFailureDialog';

const AREA_OPTIONS = [
  { id: 'SKIN', label: '피부/모피', icon: '🐾' },
  { id: 'EYE', label: '안구/눈', icon: '👁️' },
  { id: 'EAR', label: '귀/귓바퀴', icon: '👂' },
  { id: 'MOUTH', label: '구강/치아', icon: '🦷' },
  { id: 'PAW_LIMB', label: '발/관절', icon: '🐾' },
  { id: 'NOSE_RESPIRATORY', label: '코/호흡기', icon: '👃' },
  { id: 'ABDOMEN', label: '배/소화기', icon: '🩺' },
  { id: 'CUSTOM', label: '직접 입력', icon: '✏️' }
];

const HISTORY_PAGE_SIZE = 5;
const RETRYABLE_FAILURE_CODES = new Set([
  'INFERENCE_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_MODEL_UNAVAILABLE',
  'INVALID_PROVIDER_RESPONSE',
  'RAG_CORPUS_UNAVAILABLE'
]);

const FAILURE_GUIDANCE = Object.freeze({
  PROVIDER_REJECTED: '실제 반려동물의 환부가 선명하게 보이는 근접 사진으로 다시 등록해 주세요.',
  RAG_CORPUS_UNAVAILABLE: '수의학 참고 자료를 불러오지 못해 AI 소견을 폐기했습니다. 잠시 후 다시 시도해 주세요.',
  RAG_NO_EVIDENCE: '입력 증상과 연결할 수 있는 검증된 참고 자료가 없어 AI 소견을 생성하지 않았습니다.'
});

const failureGuidance = (failureCode) => FAILURE_GUIDANCE[failureCode]
  || '외부 Image 분석 Provider 응답을 검증하지 못해 AI 소견을 제공하지 못했습니다.';

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
  const [isDragging, setIsDragging] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisFailure, setAnalysisFailure] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyMeta, setHistoryMeta] = useState({ totalElements: 0, totalPages: 0 });
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [storedImage, setStoredImage] = useState(null);
  const fileInputRef = useRef(null);
  // 생성·상세는 같은 결과 영역을, 목록은 별도 영역을 갱신하므로 순번을 나눠 관리한다.
  const resultRequestRef = useRef(0);
  const historyRequestRef = useRef(0);
  const submissionRef = useRef(null);
  const closeAnalysisFailure = useCallback(() => setAnalysisFailure(null), []);

  useLayoutEffect(() => () => {
    // App의 Pet key 변경·화면 종료 시 이전 응답의 부모 Callback까지 무효화한다.
    resultRequestRef.current += 1;
    historyRequestRef.current += 1;
  }, []);

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
    const diagnosisId = analysisResult?.diagnosisId;
    const imageUrl = analysisResult?.imageUrl;
    setStoredImage(null);
    if (!diagnosisId || !imageUrl) {
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    diagnosisApi.getDiagnosisImage(diagnosisId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setStoredImage({ diagnosisId, imageUrl, objectUrl, error: '' });
      })
      .catch((error) => {
        if (!active) return;
        setStoredImage({
          diagnosisId, imageUrl, objectUrl: '',
          error: error?.message || '저장된 진단 Image를 불러오지 못했습니다.'
        });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [analysisResult?.diagnosisId, analysisResult?.imageUrl]);

  const loadHistory = useCallback(async (page = 0) => {
    const requestId = ++historyRequestRef.current;
    if (!selectedPet?.id) {
      setHistory([]);
      setHistoryError('');
      setHistoryMeta({ totalElements: 0, totalPages: 0 });
      return;
    }

    setIsHistoryLoading(true);
    try {
      const resultPage = await diagnosisApi.getHistoryByPet(selectedPet.id, page, HISTORY_PAGE_SIZE);
      if (requestId !== historyRequestRef.current) return;
      setHistory(resultPage.content);
      setHistoryPage(resultPage.page);
      setHistoryMeta({
        totalElements: resultPage.totalElements,
        totalPages: resultPage.totalPages
      });
      setHistoryError('');
    } catch (error) {
      if (requestId !== historyRequestRef.current) return;
      setHistory([]);
      setHistoryError(error?.message || '과거 진단 이력을 불러오지 못했습니다.');
    } finally {
      if (requestId === historyRequestRef.current) setIsHistoryLoading(false);
    }
  }, [selectedPet?.id]);

  useEffect(() => {
    setHistoryPage(0);
    loadHistory(0);
  }, [loadHistory]);

  const selectImage = (file) => {
    setIsDragging(false);
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

    const payload = {
      petId: selectedPet.id,
      petName: selectedPet.name || '반려동물',
      petSpecies: selectedPet.species || 'UNKNOWN',
      affectedArea, customAreaText, symptoms: selectedSymptoms,
      description: description.trim(), healthProfile: selectedPet.healthProfile
    };
    const fingerprint = JSON.stringify(payload);
    // 응답 유실/Timeout은 같은 제출을 재전송한다. 입력 변경·완료 뒤 새 분석은 새 Key다.
    if (!submissionRef.current || submissionRef.current.fingerprint !== fingerprint
        || submissionRef.current.image !== imageFile) {
      submissionRef.current = { fingerprint, image: imageFile, key: crypto.randomUUID() };
    }
    const submission = submissionRef.current;
    const requestId = ++resultRequestRef.current;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError('');
    setAnalysisFailure(null);

    try {
      const result = await diagnosisApi.analyze({ ...payload, idempotencyKey: submission.key }, imageFile);

      if (requestId !== resultRequestRef.current) return;
      if (result.petId !== selectedPet.id) throw new Error('선택한 반려동물의 진단 결과가 아닙니다.');
      if (submissionRef.current === submission) submissionRef.current = null;
      setAnalysisResult(result);
      onDiagnosisResult?.(result);
      await loadHistory(0);
      if (requestId !== resultRequestRef.current) return;
      // 응급 분기에서는 Emergency modal을 우선해 두 개의 focus trap이 동시에 열리지 않게 한다.
      if (result.riskLevel !== 'EMERGENCY' && result.failureCode) {
        setAnalysisFailure({
          code: result.failureCode,
          diagnosisId: result.diagnosisId,
          message: failureGuidance(result.failureCode),
          canRetry: RETRYABLE_FAILURE_CODES.has(result.failureCode)
        });
      }
    } catch (error) {
      if (requestId !== resultRequestRef.current) return;
      const message = error?.message || '진단 API 요청에 실패했습니다.';
      setAnalysisError(message);
      setAnalysisFailure({
        code: error?.responseBody?.failureCode || (error?.status ? `HTTP_${error.status}` : 'NETWORK_ERROR'),
        message,
        canRetry: !error?.status || error.status >= 500
      });
    } finally {
      if (requestId === resultRequestRef.current) setIsAnalyzing(false);
    }
  };

  const showStoredDiagnosis = async (diagnosisId) => {
    const requestId = ++resultRequestRef.current;
    setIsAnalyzing(false);
    setAnalysisError('');
    setAnalysisFailure(null);
    try {
      const result = await diagnosisApi.getDiagnosis(diagnosisId);
      if (requestId !== resultRequestRef.current) return;
      if (result.petId !== selectedPet?.id || result.diagnosisId !== diagnosisId) {
        throw new Error('선택한 진단 이력과 응답이 일치하지 않습니다.');
      }
      setAnalysisResult(result);
      setAnalysisError('');
      setAnalysisFailure(null);
      onDiagnosisResult?.(result);
    } catch (error) {
      if (requestId !== resultRequestRef.current) return;
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
  const ragSources = analysisResult?.ragSources || [];
  const isRagPrototype = analysisResult?.analysisMode === 'GEMINI_RAG_PROTOTYPE';
  // 입력 Preview는 바뀔 수 있으므로 결과에는 현재 진단에 결속된 저장 사진만 표시한다.
  const resultImage = storedImage?.diagnosisId === analysisResult?.diagnosisId
    && storedImage?.imageUrl === analysisResult?.imageUrl ? storedImage : null;
  const resultImageUrl = resultImage?.objectUrl || '';
  const storedImageError = resultImage ? resultImage.error
    : analysisResult?.imageUrl ? '저장된 환부 Image를 불러오는 중입니다.' : '';

  const printDiagnosisReport = () => {
    window.print();
  };

  return (
    <section id="diagnosis-section" style={{ padding: '60px 0', background: '#ffffff' }}>
      <DiagnosisFailureDialog
        failure={analysisFailure}
        isRetrying={isAnalyzing}
        onRetry={handleRunDiagnosis}
        onClose={closeAnalysisFailure}
      />
      <AiBenchmarkModal isOpen={isBenchmarkOpen} onClose={() => setIsBenchmarkOpen(false)} />
      <style>{`
        @media print {
          body { margin: 0 !important; min-height: 0 !important; background: white !important; }
          body *:not(:has(#diagnosis-print-report)):not(#diagnosis-print-report):not(#diagnosis-print-report *) {
            display: none !important;
          }
          body *:has(#diagnosis-print-report) {
            display: block !important; position: static !important;
            height: auto !important; min-height: 0 !important;
            margin: 0 !important; padding: 0 !important;
          }
          #diagnosis-print-report, #diagnosis-print-report * { animation: none !important; transform: none !important; }
          #diagnosis-print-report {
            display: block !important;
            position: static !important;
            min-height: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          .diagnosis-no-print { display: none !important; }
        }
        @media (max-width: 720px) {
          .diagnosis-area-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .diagnosis-pet-grid { grid-template-columns: 1fr !important; }
          .diagnosis-result-actions { flex-direction: column !important; }
          .diagnosis-result-actions .btn, .care-flow-actions .btn {
            width: 100% !important;
            padding-right: 14px !important;
            padding-left: 14px !important;
            white-space: normal !important;
          }
          .diagnosis-evaluation-footer { align-items: flex-start !important; flex-direction: column !important; }
        }
      `}</style>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 14px', borderRadius: '9999px' }}>
            AI DIAGNOSIS PIPELINE
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>
            반려동물 AI 질병 진단 스튜디오
          </h2>
          <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
            환부 Image와 증상을 입력하면 검증된 AI 소견과 입력 기반 Safety Triage를 구분해 안내합니다.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '28px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> 진단 정보 및 환부 Image 등록
            </h3>

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
              <legend className="sr-only">0. 등록된 반려동물 선택</legend>
              <div style={{
                background: selectedPet ? '#f8fafc' : '#fffbeb',
                border: selectedPet ? '1px solid #e2e8f0' : '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: pets.length > 1 ? '12px' : 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ fontSize: '24px' }}>{selectedPet?.icon || '🐾'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      {selectedPet ? selectedPet.name : '등록된 반려동물 선택 필요'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {selectedPet
                        ? `${selectedPet.species || '종 미지정'} · ${selectedPet.breed || '품종 미지정'}`
                        : '로그인 후 진단할 반려동물을 선택하거나 등록하세요.'}
                    </div>
                  </div>
                </div>
                <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '9999px', background: selectedPet ? '#ecfdf5' : '#fef3c7', color: selectedPet ? '#047857' : '#b45309', border: selectedPet ? '1px solid #a7f3d0' : '1px solid #fde68a' }}>
                  {selectedPet ? '진단 대상' : '미선택'}
                </span>
              </div>

              {pets.length > 0 ? (
                <div className="diagnosis-pet-grid" style={{ display: pets.length > 1 ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {pets.map((pet) => {
                    const isSelected = selectedPet?.id === pet.id;
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectPet?.(pet)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                          background: isSelected ? '#ecfdf5' : '#f8fafc',
                          color: '#0f172a',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'inherit'
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
                <div style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
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

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 20px' }}>
              <legend style={{ display: 'block', width: '100%', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: '700' }}>
                1. 환부 카테고리 선택
              </legend>
              <div className="diagnosis-area-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
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
                    padding: '10px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: affectedArea === area.id ? '2px solid #10b981' : '1px solid #e2e8f0',
                    background: affectedArea === area.id ? '#ecfdf5' : '#f8fafc',
                    color: affectedArea === area.id ? '#047857' : '#475569',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    textAlign: 'center',
                    fontFamily: 'inherit'
                  }}
                >
                  <div>{area.icon}</div>
                  <div style={{ marginTop: '2px' }}>{area.label}</div>
                </button>
              ))}
              </div>

              {affectedArea === 'CUSTOM' && (
                <input
                  value={customAreaText}
                  onChange={(event) => setCustomAreaText(event.target.value)}
                  maxLength={100}
                  aria-label="직접 입력한 환부 이름"
                  placeholder="예: 오른쪽 꼬리 끝 부위, 목 뒤쪽 관절 등"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #10b981', background: '#ecfdf5', fontSize: '13px', outline: 'none' }}
                />
              )}
            </fieldset>

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 20px' }}>
              <legend style={{ display: 'block', width: '100%', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: '700' }}>
                2. 부위별 주요 증상 선택 (복수 선택)
              </legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '34px' }}>
              {(symptomOptions[affectedArea] || []).map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  aria-pressed={selectedSymptoms.includes(symptom)}
                  onClick={() => toggleSymptom(symptom)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: selectedSymptoms.includes(symptom) ? '1px solid #059669' : '1px solid #cbd5e1',
                    background: selectedSymptoms.includes(symptom) ? '#ecfdf5' : '#f1f5f9',
                    color: selectedSymptoms.includes(symptom) ? '#047857' : '#475569',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: 'inherit'
                  }}
                >
                  {selectedSymptoms.includes(symptom) ? '✓ ' : '+ '}{symptom}
                </button>
              ))}
              {!symptomOptions[affectedArea] && <span style={{ color: '#64748b', fontSize: '13px' }}>증상 선택지를 불러오는 중입니다.</span>}
              </div>
            </fieldset>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <label htmlFor="diagnosis-image" style={{ fontSize: '13px', color: '#475569', fontWeight: '700' }}>
                  3. 환부 Image 등록 <span style={{ color: '#059669' }}>*</span>
                </label>
                {imageFile && (
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                    ✓ 사용자 Image 선택됨
                  </span>
                )}
              </div>
              <input
                id="diagnosis-image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectImage(event.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="diagnosis-image"
                className={`photo-upload-container ${isDragging ? 'drag-over' : ''}`}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  selectImage(event.dataTransfer.files?.[0]);
                }}
                style={{ display: 'block', padding: '18px' }}
              >
                <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', background: 'linear-gradient(135deg, #ecfdf5 0%, #f8fafc 100%)', border: '1px solid #e2e8f0' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="선택한 환부" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#64748b' }}>
                      <div>
                        <div style={{ fontSize: '42px', marginBottom: '6px' }}>📸</div>
                        <strong style={{ display: 'block', color: '#334155', fontSize: '14px' }}>환부가 선명하게 보이는 Image를 등록하세요.</strong>
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px' }}>JPEG·PNG·WEBP · 최대 10MB</span>
                      </div>
                    </div>
                  )}
                </div>
                <span className="photo-btn-gradient" style={{ padding: '9px 18px', fontSize: '13px' }}>
                  <span>📸</span> {imageFile ? 'Image 변경하기' : '환부 Image 업로드'}
                </span>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '10px', fontWeight: '500', overflowWrap: 'anywhere' }}>
                  {imageFile?.name ? `📄 첨부된 File: ${imageFile.name}` : '클릭하거나 이 영역으로 Image를 끌어 놓으세요.'}
                </div>
              </label>
              {imageFile && (
                <button type="button" onClick={clearImage} className="btn btn-secondary" style={{ marginTop: '8px', padding: '8px 14px', fontSize: '12px' }}>
                  선택한 Image 제거
                </button>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="diagnosis-description" style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: '700' }}>
                4. 상세 증상 설명
              </label>
              <textarea
                id="diagnosis-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="언제부터, 얼마나 자주, 어떤 변화가 있었는지 작성해 주세요."
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-sm)', color: '#0f172a', padding: '10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>{description.length}/2000</div>
            </div>

            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={isAnalyzing || !canAnalyze}
              aria-busy={isAnalyzing}
              className="btn-diagnosis-glow"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-pulse-glow" style={{ fontSize: '20px' }}>🤖</span>
                  <span>Image와 증상 분석 중…</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px' }}>✨</span>
                  <span>AI 질병 진단 실행하기</span>
                  <span style={{ fontSize: '11.5px', background: 'rgba(255, 255, 255, 0.22)', padding: '4px 12px', borderRadius: '9999px', fontWeight: '800', marginLeft: 'auto', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                    안전 검증 포함
                  </span>
                </>
              )}
            </button>
            <div aria-live="polite" aria-atomic="true">
              {analysisError && <p role="alert" style={{ color: '#dc2626', fontWeight: 700 }}>{analysisError}</p>}
            </div>
          </div>

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
                    <button type="button" onClick={printDiagnosisReport} className="btn btn-secondary diagnosis-no-print" style={{ padding: '7px 12px', fontSize: '12px' }}>
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
                  {' · 환부: '}{AREA_OPTIONS.find(area => area.id === analysisResult.affectedArea)?.label || analysisResult.affectedArea}
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
                      {RETRYABLE_FAILURE_CODES.has(analysisResult.failureCode) && (
                        <button
                          type="button"
                          onClick={() => setAnalysisFailure({
                            code: analysisResult.failureCode,
                            diagnosisId: analysisResult.diagnosisId,
                            message: failureGuidance(analysisResult.failureCode),
                            canRetry: Boolean(imageFile)
                              && RETRYABLE_FAILURE_CODES.has(analysisResult.failureCode)
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
                        검증된 Image 소견이 없습니다. 질환명이나 확률을 임의 생성하지 않았습니다.
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
        </div>

        <div className="glass-card" style={{ padding: '28px', marginTop: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '20px' }}>🗂️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>과거 진단 이력</h3>
              <span style={{ color: '#64748b', fontSize: '12px' }}>총 {historyMeta.totalElements}건</span>
              </div>
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
                  padding: '14px 16px',
                  border: analysisResult?.diagnosisId === record.diagnosisId ? '2px solid #10b981' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  background: analysisResult?.diagnosisId === record.diagnosisId ? '#ecfdf5' : '#fff',
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
            <button type="button" onClick={() => setIsBenchmarkOpen(true)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
              평가 기준 자세히 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

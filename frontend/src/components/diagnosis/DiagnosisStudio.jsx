import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { diagnosisApi } from '../../api/diagnosisApi';
import AiBenchmarkModal from './AiBenchmarkModal';
import DiagnosisEvaluation from './DiagnosisEvaluation';
import DiagnosisFailureDialog from './DiagnosisFailureDialog';
import DiagnosisForm from './DiagnosisForm';
import DiagnosisHistory from './DiagnosisHistory';
import DiagnosisResult from './DiagnosisResult';

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
  PROVIDER_REJECTED: '선택한 동물과 부위가 일치하는지 확인하고, 해당 부위가 선명하게 보이는 실제 사진으로 다시 등록해 주세요.',
  OUT_OF_SCOPE: '등록된 동물과 환부 선택을 다시 확인해 주세요. 계속되면 Backend와 AI 서버의 지원 범위가 같은 버전인지 확인이 필요합니다.',
  RAG_CORPUS_UNAVAILABLE: '수의학 참고 자료를 불러오지 못해 AI 소견을 폐기했습니다. 잠시 후 다시 시도해 주세요.',
  RAG_NO_EVIDENCE: '입력 증상과 연결할 수 있는 검증된 참고 자료가 없어 AI 소견을 생성하지 않았습니다.'
});

const failureGuidance = (failureCode) => FAILURE_GUIDANCE[failureCode]
  || '외부 Image 분석 Provider 응답을 검증하지 못해 AI 소견을 제공하지 못했습니다.';

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
      affectedArea, customAreaText: affectedArea === 'CUSTOM' ? customAreaText.trim() : '', symptoms: selectedSymptoms,
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
  // 입력 Preview는 바뀔 수 있으므로 결과에는 현재 진단에 결속된 저장 사진만 표시한다.
  const resultImage = storedImage?.diagnosisId === analysisResult?.diagnosisId
    && storedImage?.imageUrl === analysisResult?.imageUrl ? storedImage : null;
  const resultImageUrl = resultImage?.objectUrl || '';
  const storedImageError = resultImage ? resultImage.error
    : analysisResult?.imageUrl ? '저장된 환부 Image를 불러오는 중입니다.' : '';
  const openRetryGuidance = RETRYABLE_FAILURE_CODES.has(analysisResult?.failureCode)
    ? () => setAnalysisFailure({
      code: analysisResult.failureCode,
      diagnosisId: analysisResult.diagnosisId,
      message: failureGuidance(analysisResult.failureCode),
      canRetry: Boolean(imageFile) && RETRYABLE_FAILURE_CODES.has(analysisResult.failureCode)
    })
    : undefined;

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
          <DiagnosisForm
            affectedArea={affectedArea}
            analysisError={analysisError}
            areaOptions={AREA_OPTIONS}
            canAnalyze={canAnalyze}
            customAreaText={customAreaText}
            description={description}
            fileInputRef={fileInputRef}
            imageFile={imageFile}
            imagePreview={imagePreview}
            isAnalyzing={isAnalyzing}
            isAuthenticated={isAuthenticated}
            isDragging={isDragging}
            onClearImage={clearImage}
            onCustomAreaChange={setCustomAreaText}
            onDescriptionChange={setDescription}
            onDragChange={setIsDragging}
            onOpenLogin={onOpenLogin}
            onOpenPetManagement={onOpenPetManagement}
            onRunDiagnosis={handleRunDiagnosis}
            onSelectArea={(area) => {
              setAffectedArea(area);
              setSelectedSymptoms([]);
            }}
            onSelectImage={selectImage}
            onSelectPet={onSelectPet}
            onToggleSymptom={toggleSymptom}
            pets={pets}
            selectedPet={selectedPet}
            selectedSymptoms={selectedSymptoms}
            symptomOptions={symptomOptions}
          />
          <DiagnosisResult
            affectedAreaOptions={AREA_OPTIONS}
            analysisError={analysisError}
            analysisResult={analysisResult}
            isAnalyzing={isAnalyzing}
            onNavigateTimeline={onNavigateTimeline}
            onOpenCareFlow={onOpenCareFlow}
            onOpenRetryGuidance={openRetryGuidance}
            onPrint={() => window.print()}
            resultImageUrl={resultImageUrl}
            selectedPet={selectedPet}
            storedImageError={storedImageError}
          />
        </div>

        <DiagnosisHistory
          activeDiagnosisId={analysisResult?.diagnosisId}
          history={history}
          historyError={historyError}
          historyMeta={historyMeta}
          historyPage={historyPage}
          isHistoryLoading={isHistoryLoading}
          onLoadPage={loadHistory}
          onSelectDiagnosis={showStoredDiagnosis}
        />
        <DiagnosisEvaluation onOpenBenchmark={() => setIsBenchmarkOpen(true)} />
      </div>
    </section>
  );
}

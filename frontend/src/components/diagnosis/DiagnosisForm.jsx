import React from 'react';

export default function DiagnosisForm({
  affectedArea,
  analysisError,
  areaOptions,
  canAnalyze,
  customAreaText,
  description,
  fileInputRef,
  imageFile,
  imagePreview,
  isAnalyzing,
  isAuthenticated,
  isDragging,
  onClearImage,
  onCustomAreaChange,
  onDescriptionChange,
  onDragChange,
  onOpenLogin,
  onOpenPetManagement,
  onRunDiagnosis,
  onSelectArea,
  onSelectImage,
  onSelectPet,
  onToggleSymptom,
  pets,
  selectedPet,
  selectedSymptoms,
  symptomOptions
}) {
  return (
    <div className="glass-card" style={{ padding: '32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📋</span> 진단 정보 및 환부 Image 등록
      </h3>

      <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
        <legend style={{ display: 'block', width: '100%', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: '700' }}>
          0. 등록된 반려동물 선택
        </legend>
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
                  : isAuthenticated
                    ? '진단할 반려동물을 선택하거나 등록하세요.'
                    : '로그인하면 등록된 반려동물을 불러올 수 있습니다.'}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p style={{ flex: '1 1 220px', margin: 0, color: '#64748b', fontSize: '12px', lineHeight: '1.5' }}>
              {isAuthenticated ? '진단할 반려동물을 먼저 등록해 주세요.' : '로그인 후 등록된 반려동물을 선택할 수 있습니다.'}
            </p>
            <button
              type="button"
              onClick={isAuthenticated ? onOpenPetManagement : onOpenLogin}
              className="btn btn-secondary"
              style={{ flexShrink: 0, padding: '8px 14px', fontSize: '12px' }}
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
          {areaOptions.map((area) => (
            <button
              key={area.id}
              type="button"
              aria-pressed={affectedArea === area.id}
              onClick={() => onSelectArea(area.id)}
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
            onChange={(event) => onCustomAreaChange(event.target.value)}
            maxLength={100}
            aria-label="직접 입력한 환부 이름"
            placeholder="예: 오른쪽 꼬리 끝 부위, 목 뒤쪽 관절 등"
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #10b981', background: '#ecfdf5', fontSize: '13px', outline: 'none' }}
          />
        )}
        <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: '8px 0 0' }}>
          등록된 동물 6분류·환부 8개 메뉴의 사진 관찰을 요청할 수 있습니다.
          조류의 깃털·부리는 피부·구강, 날개는 발·관절 메뉴를 이용해 주세요.
          사진만으로 내부 질환을 판정하지 않으며, 맞는 참고자료가 없으면 관찰 소견과 한계만 안내합니다.
        </p>
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
              onClick={() => onToggleSymptom(symptom)}
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
          onChange={(event) => onSelectImage(event.target.files?.[0])}
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
            onDragChange(true);
          }}
          onDragLeave={() => onDragChange(false)}
          onDrop={(event) => {
            event.preventDefault();
            onSelectImage(event.dataTransfer.files?.[0]);
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
          <button type="button" onClick={onClearImage} className="btn btn-secondary" style={{ marginTop: '8px', padding: '8px 14px', fontSize: '12px' }}>
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
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="언제부터, 얼마나 자주, 어떤 변화가 있었는지 작성해 주세요."
          style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-sm)', color: '#0f172a', padding: '10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
        />
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>{description.length}/2000</div>
      </div>

      <button
        type="button"
        onClick={onRunDiagnosis}
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
  );
}

import React, { useState, useRef } from 'react';
import { petApi } from '../api/petApi';

export default function PetRegisterModal({ isOpen, onClose, onPetCreated }) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('DOG');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [icon, setIcon] = useState('🐶');
  const [profileImage, setProfileImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const speciesOptions = [
    { id: 'DOG', label: '강아지', icon: '🐶', defaultIcon: '🐶', defaultBreed: '믹스견' },
    { id: 'CAT', label: '고양이', icon: '🐱', defaultIcon: '🐱', defaultBreed: '코리안 숏헤어' },
    { id: 'RABBIT', label: '토끼', icon: '🐰', defaultIcon: '🐰', defaultBreed: '드워프 토끼' },
    { id: 'HAMSTER', label: '햄스터/소동물', icon: '🐹', defaultIcon: '🐹', defaultBreed: '골든 햄스터' },
    { id: 'BIRD', label: '조류/앵무새', icon: '🦜', defaultIcon: '🦜', defaultBreed: '모란앵무' },
    { id: 'OTHER', label: '파충류/기타', icon: '🐢', defaultIcon: '🐢', defaultBreed: '육지거북/기타' }
  ];

  const handleSpeciesChange = (opt) => {
    setSpecies(opt.id);
    setIcon(opt.defaultIcon);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const savedUserStr = localStorage.getItem('petcare_user');
    const currentUser = savedUserStr ? JSON.parse(savedUserStr) : null;

    if (!currentUser) {
      setMessage('🔒 반려동물 등록은 로그인 후 이용하실 수 있습니다.');
      return;
    }

    if (!name.trim()) {
      setMessage('반려동물 이름을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const currentSpeciesObj = speciesOptions.find(s => s.id === species);

    try {
      const newPet = await petApi.createPet({
        userId: currentUser.id || 1,
        name: name.trim(),
        species,
        breed: breed.trim() || currentSpeciesObj?.defaultBreed || '기타',
        age: age.trim() || '1살',
        weight: weight.trim() ? (weight.trim().includes('kg') ? weight.trim() : `${weight.trim()}kg`) : '3.5kg',
        icon: icon || currentSpeciesObj?.defaultIcon || '🐾',
        profileImageUrl: profileImage || null
      });

      if (onPetCreated) {
        onPetCreated(newPet);
      }
      onClose();
    } catch (err) {
      setMessage('반려동물 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #f1f5f9',
        padding: '32px'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            margin: '0 auto 12px auto',
            border: '1px solid #a7f3d0'
          }}>
            🐾
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            새 반려동물 등록
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '4px', margin: 0 }}>
            아이의 프로필을 등록하고 AI 스마트 맞춤 케어를 시작하세요.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {message && (
            <div style={{ padding: '10px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>
              {message}
            </div>
          )}

          {/* Photo Registration Section */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              프로필 사진 등록 (선택)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  background: profileImage ? `url(${profileImage}) center/cover` : '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {!profileImage && <span>📷</span>}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    border: '1px solid #059669',
                    background: '#ecfdf5',
                    color: '#059669',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <span>📸</span> {profileImage ? '사진 변경하기' : '사진 등록하기'}
                </button>
                {profileImage && (
                  <button
                    type="button"
                    onClick={() => setProfileImage(null)}
                    style={{
                      marginLeft: '6px',
                      padding: '8px 12px',
                      borderRadius: '9999px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#64748b',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 1. Multi-Species Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              동물 종류 선택 (6종)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {speciesOptions.map((opt) => {
                const isSelected = species === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSpeciesChange(opt)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      color: isSelected ? '#047857' : '#475569',
                      fontWeight: '700',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pet Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              이름 <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="예: 초코, 해피, 코코, 뭉치"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              required
            />
          </div>

          {/* 3. Breed & Age */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>품종</label>
              <input
                type="text"
                placeholder={speciesOptions.find(s => s.id === species)?.defaultBreed}
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>나이</label>
              <input
                type="text"
                placeholder="예: 2살"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* 4. Weight & Representative Icon Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>몸무게</label>
              <input
                type="text"
                placeholder="예: 3.5kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>대표 아이콘</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['🐶', '🐱', '🐰', '🐹', '🦜', '🐢', '🐾', '🐟'].map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: icon === ic ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: icon === ic ? '#ecfdf5' : '#ffffff',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '13px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '800',
              borderRadius: '14px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? '등록 처리 중...' : '✨ 반려동물 등록 완료'}
          </button>
        </form>

      </div>
    </div>
  );
}

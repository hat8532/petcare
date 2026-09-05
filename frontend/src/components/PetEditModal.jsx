import React, { useState, useEffect, useRef } from 'react';
import { petApi } from '../api/petApi';

export default function PetEditModal({ isOpen, onClose, pet, onPetUpdated, onPetDeleted }) {
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

  const speciesOptions = [
    { id: 'DOG', label: '강아지', icon: '🐶', defaultIcon: '🐶', defaultBreed: '믹스견' },
    { id: 'CAT', label: '고양이', icon: '🐱', defaultIcon: '🐱', defaultBreed: '코리안 숏헤어' },
    { id: 'RABBIT', label: '토끼', icon: '🐰', defaultIcon: '🐰', defaultBreed: '드워프 토끼' },
    { id: 'HAMSTER', label: '햄스터/소동물', icon: '🐹', defaultIcon: '🐹', defaultBreed: '골든 햄스터' },
    { id: 'BIRD', label: '조류/앵무새', icon: '🦜', defaultIcon: '🦜', defaultBreed: '모란앵무' },
    { id: 'OTHER', label: '파충류/기타', icon: '🐢', defaultIcon: '🐢', defaultBreed: '육지거북/기타' }
  ];

  useEffect(() => {
    if (pet) {
      setName(pet.name || '');
      setSpecies(pet.species || 'DOG');
      setBreed(pet.breed || '');
      setAge(pet.age || '');
      setWeight(pet.weight ? pet.weight.replace('kg', '') : '');
      setIcon(pet.icon || '🐶');
      setProfileImage(pet.profileImageUrl || null);
    }
  }, [pet]);

  if (!isOpen || !pet) return null;

  const handleSpeciesChange = (opt) => {
    setSpecies(opt.id);
    setIcon(opt.defaultIcon);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setMessage('반려동물 이름을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const currentSpeciesObj = speciesOptions.find(s => s.id === species);

    const updatedPayload = {
      userId: pet.userId || 1,
      name: name.trim(),
      species,
      breed: breed.trim() || currentSpeciesObj?.defaultBreed || '기타',
      age: age.trim() || '1살',
      weight: weight.trim() ? (weight.trim().includes('kg') ? weight.trim() : `${weight.trim()}kg`) : '3.5kg',
      icon: icon || currentSpeciesObj?.defaultIcon || '🐾',
      profileImageUrl: profileImage || null
    };

    try {
      const updatedPet = await petApi.updatePet(pet.id, updatedPayload);
      if (onPetUpdated) {
        onPetUpdated({ id: pet.id, ...updatedPayload });
      }
      onClose();
    } catch (err) {
      setMessage('반려동물 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`정말로 [${pet.name}] 프로필을 삭제하시겠습니까?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await petApi.deletePet(pet.id);
      if (onPetDeleted) {
        onPetDeleted(pet.id);
      }
      onClose();
    } catch (e) {
      setMessage('반려동물 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      background: 'rgba(11, 15, 25, 0.45)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="fade-in" style={{
        width: '100%',
        maxWidth: '520px',
        background: '#ffffff',
        borderRadius: '28px',
        padding: '34px 30px',
        boxShadow: '0 25px 60px -15px rgba(11, 15, 25, 0.25)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>✏️</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0b0f19', margin: 0, letterSpacing: '-0.3px' }}>
                반려동물 정보 수정
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0', fontWeight: '500' }}>
                {pet.name}의 이름, 종, 품종, 체중 정보 및 프로필 사진을 수정하세요.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        {message && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12.5px', marginBottom: '16px', fontWeight: '600' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Profile Photo Registration */}
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px border #e2e8f0' }}>
            <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto 10px auto' }}>
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #059669' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ecfdf5', border: '2px dashed #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                  {icon}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                className="photo-btn-gradient"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '7px 16px', fontSize: '12px' }}
              >
                📸 사진 변경하기
              </button>
              {profileImage && (
                <button
                  type="button"
                  onClick={() => setProfileImage(null)}
                  style={{ padding: '7px 12px', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', cursor: 'pointer' }}
                >
                  기본 아이콘으로
                </button>
              )}
            </div>
          </div>

          {/* Species Selection Grid */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
              동물 종류 선택
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {speciesOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSpeciesChange(opt)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '12px',
                    border: species === opt.id ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: species === opt.id ? '#ecfdf5' : '#ffffff',
                    color: species === opt.id ? '#047857' : '#475569',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pet Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              반려동물 이름 <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 초코, 나비, 콩이"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
              required
            />
          </div>

          {/* Breed & Age */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                세부 품종
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="예: 토이푸들, 코숏"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                나이
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="예: 3살, 6개월"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Weight */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              몸무게 (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="예: 4.2"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              style={{
                padding: '13px 18px',
                fontSize: '13px',
                borderRadius: '14px',
                background: '#fff1f2',
                color: '#e11d48',
                border: '1px solid #fecdd3',
                fontWeight: '800',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🗑️ 프로필 삭제
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="card-hover-lift"
              style={{
                flex: 1,
                padding: '13px 20px',
                fontSize: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? '수정 중...' : '💾 반려동물 정보 수정 완료'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

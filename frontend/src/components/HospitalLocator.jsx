import React, { useState, useEffect, useRef, useMemo } from 'react';
import { hospitalApi } from '../api/hospitalApi';

const HTML_ESCAPE_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

function cleanHospitalName(rawName) {
  if (!rawName) return '';
  return String(rawName)
    .replace(/<[^>]*>/g, '')
    .replace(/[§\u00A7]/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function safeNaverMapUrl(rawUrl, hospitalName) {
  const cleanName = cleanHospitalName(hospitalName);
  const fallback = `https://map.naver.com/v5/search/${encodeURIComponent(cleanName || '24시 동물병원')}`;
  if (!rawUrl) return fallback;

  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' && parsed.hostname === 'map.naver.com'
      ? parsed.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

// 같은 병원인지 판단하는 고유 키
function hospitalKey(h) {
  const name = cleanHospitalName(h?.name || '');
  return `${name.replace(/\s/g, '')}|${(h?.address || '').replace(/\s/g, '')}`;
}

export default function HospitalLocator({ user, onOpenLogin }) {
  const [filter24h, setFilter24h] = useState(true);
  const [filterBookmarksOnly, setFilterBookmarksOnly] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 찜 목록 Set
  const [bookmarkKeys, setBookmarkKeys] = useState(() => new Set());
  const [bookmarkBusy, setBookmarkBusy] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. 내 실제 GPS 위치
  const [userGps, setUserGps] = useState({
    lat: 37.4760,
    lng: 126.8803,
    name: '서울 구로·가산 (내 위치)'
  });

  // 2. 지도 중심 위치 (드래그 시 실시간 변경)
  const [mapCenter, setMapCenter] = useState({
    lat: 37.4760,
    lng: 126.8803,
    regionName: '구로·가산'
  });

  const [locating, setLocating] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // 찜 목록 불러오기
  useEffect(() => {
    if (!user) {
      setBookmarkKeys(new Set());
      return;
    }

    async function loadBookmarks() {
      try {
        const saved = await hospitalApi.getBookmarks();
        if (Array.isArray(saved)) {
          setBookmarkKeys(new Set(saved.map(hospitalKey)));
        }
      } catch (err) {
        console.warn('찜 목록 로드 실패:', err);
      }
    }
    loadBookmarks();
  }, [user]);

  // 찜 토글 핸들러
  async function handleToggleBookmark(hospital) {
    if (!user) {
      alert('🔒 로그인 후 병원을 찜할 수 있습니다.');
      onOpenLogin?.();
      return;
    }

    const key = hospitalKey(hospital);
    if (bookmarkBusy === key) return;
    setBookmarkBusy(key);

    try {
      const result = await hospitalApi.toggleBookmark(hospital);
      setBookmarkKeys((prev) => {
        const next = new Set(prev);
        if (result.bookmarked) next.add(key);
        else next.delete(key);
        return next;
      });
    } catch (error) {
      if (error?.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        onOpenLogin?.();
        return;
      }
      alert('찜 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBookmarkBusy('');
    }
  }

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const hospitalMarkersRef = useRef([]);
  const isInternalMoveRef = useRef(false);
  const debounceTimerRef = useRef(null);

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  function getRegionName(lat, lng) {
    if (lat >= 37.45 && lat <= 37.49 && lng >= 126.84 && lng <= 126.91) return '구로·가산';
    if (lat >= 37.44 && lat <= 37.48 && lng >= 126.88 && lng <= 126.92) return '금천·독산';
    if (lat >= 37.46 && lat <= 37.49 && lng >= 126.91 && lng <= 126.97) return '관악·신림';
    if (lat >= 37.48 && lat <= 37.52 && lng >= 126.92 && lng <= 127.00) return '동작·사당';
    if (lat >= 37.46 && lat <= 37.51 && lng >= 127.00 && lng <= 127.05) return '서초·방배';
    if (lat >= 37.48 && lat <= 37.53 && lng >= 127.02 && lng <= 127.08) return '강남·역삼';
    if (lat >= 37.49 && lat <= 37.54 && lng >= 127.08 && lng <= 127.15) return '송파·잠실';
    if (lat >= 37.52 && lat <= 37.57 && lng >= 127.11 && lng <= 127.18) return '강동·천호';
    if (lat >= 37.50 && lat <= 37.54 && lng >= 126.88 && lng <= 126.94) return '영등포·여의도';
    if (lat >= 37.50 && lat <= 37.55 && lng >= 126.82 && lng <= 126.88) return '양천·목동';
    if (lat >= 37.53 && lat <= 37.58 && lng >= 126.80 && lng <= 126.86) return '강서·마곡';
    if (lat >= 37.54 && lat <= 37.58 && lng >= 126.90 && lng <= 126.96) return '마포·신촌';
    if (lat >= 37.52 && lat <= 37.55 && lng >= 126.95 && lng <= 127.01) return '용산·이태원';
    if (lat >= 37.55 && lat <= 37.59 && lng >= 126.96 && lng <= 127.02) return '종로·광화문';
    if (lat >= 37.53 && lat <= 37.57 && lng >= 127.02 && lng <= 127.07) return '성동·성수';
    if (lat >= 37.53 && lat <= 37.57 && lng >= 127.06 && lng <= 127.11) return '광진·건대';
    if (lat >= 37.57 && lat <= 37.62 && lng >= 127.03 && lng <= 127.12) return '동대문·중랑';
    if (lat >= 37.58 && lat <= 37.68 && lng >= 127.00 && lng <= 127.10) return '노원·성북';
    if (lat >= 37.47 && lat <= 37.53 && lng >= 126.74 && lng <= 126.83) return '부천·중동';
    if (lat >= 37.43 && lat <= 37.55 && lng >= 126.65 && lng <= 126.75) return '인천·부평';
    if (lat >= 37.60 && lat <= 37.69 && lng >= 126.75 && lng <= 126.88) return '고양·일산';
    if (lat >= 37.36 && lat <= 37.43 && lng >= 126.89 && lng <= 126.97) return '안양·평촌';
    if (lat >= 37.33 && lat <= 37.44 && lng >= 127.07 && lng <= 127.16) return '분당·판교';
    if (lat >= 37.24 && lat <= 37.32 && lng >= 126.95 && lng <= 127.07) return '수원·영통';
    if (lat >= 35.08 && lat <= 35.25 && lng >= 128.95 && lng <= 129.22) return '부산 센터';

    const latCode = Math.floor((lat % 1) * 100);
    const lngCode = Math.floor((lng % 1) * 100);
    const prefixes = ['중앙', '메트로', '더블유', '아크로', '로얄', '스마트', '웰니스', '라온', '센트럴', '프라임'];
    const p1 = prefixes[latCode % prefixes.length];
    const p2 = prefixes[lngCode % prefixes.length];
    return `${p1}·${p2}`;
  }

  // 주변 병원 목록 불러오기
  useEffect(() => {
    async function fetchHospitals() {
      setLoading(true);

      let backendData = [];
      try {
        backendData = await hospitalApi.getNearbyHospitals(mapCenter.lat, mapCenter.lng, filter24h, mapCenter.regionName);
      } catch (error) {
        console.warn('주변 병원 조회 실패:', error);
      }
      
      const combined = Array.isArray(backendData) ? backendData : [];
      const filtered = combined.filter(h => filter24h ? h.isEmergency24h : true);

      const calculated = filtered.map(h => {
        const hLat = h.latitude || h.lat || (mapCenter.lat + 0.003);
        const hLng = h.longitude || h.lng || (mapCenter.lng + 0.003);
        
        const distFromGps = calculateDistance(userGps.lat, userGps.lng, hLat, hLng);
        const distFromCenter = calculateDistance(mapCenter.lat, mapCenter.lng, hLat, hLng);
        return {
          ...h,
          name: cleanHospitalName(h.name),
          distance: Math.min(distFromGps, distFromCenter),
          lat: hLat,
          lng: hLng
        };
      });

      calculated.sort((a, b) => a.distance - b.distance);

      setHospitals(calculated);
      if (calculated.length > 0) {
        setSelectedHospital(calculated[0]);
      } else {
        setSelectedHospital(null);
      }
      setLoading(false);
    }
    fetchHospitals();
  }, [filter24h, mapCenter]);

  // Leaflet 지도 인스턴스 초기화 및 마커 렌더링
  useEffect(() => {
    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => renderRealMap();
        document.body.appendChild(script);
      } else {
        renderRealMap();
      }
    };

    const renderRealMap = () => {
      if (!window.L || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = window.L.map(mapContainerRef.current, {
          center: [mapCenter.lat, mapCenter.lng],
          zoom: 14,
          zoomControl: false
        });

        window.L.control.zoom({ position: 'topright' }).addTo(map);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        map.on('moveend', () => {
          if (isInternalMoveRef.current) {
            isInternalMoveRef.current = false;
            return;
          }

          const center = map.getCenter();
          const newLat = parseFloat(center.lat.toFixed(4));
          const newLng = parseFloat(center.lng.toFixed(4));
          const dist = calculateDistance(mapCenter.lat, mapCenter.lng, newLat, newLng);

          if (dist > 0.2) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              const regionName = getRegionName(newLat, newLng);
              setMapCenter({
                lat: newLat,
                lng: newLng,
                regionName
              });
            }, 350);
          }
        });

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
      }, 150);

      // 내 GPS 위치 마커 (파란 펄스 점)
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userGps.lat, userGps.lng]);
      } else {
        const userIcon = window.L.divIcon({
          className: 'user-gps-marker',
          html: `<div style="background:#2563eb; width:22px; height:22px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 14px rgba(37,99,235,0.9); position:relative;">
                  <div style="position:absolute; inset:-5px; border-radius:50%; border:2px solid #60a5fa; animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        userMarkerRef.current = window.L.marker([userGps.lat, userGps.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>📍 내 실제 GPS 위치</b><br/>${escapeHtml(userGps.name)}`);
      }

      // 병원 마커 렌더링
      hospitalMarkersRef.current.forEach(m => map.removeLayer(m));
      hospitalMarkersRef.current = [];

      hospitals.forEach((h) => {
        const isEmergency = h.isEmergency24h;
        const safeName = escapeHtml(h.name);
        const safeAddress = escapeHtml(h.address);
        const safePlaceUrl = escapeHtml(safeNaverMapUrl(h.naverPlaceUrl, h.name));
        const isSelected = selectedHospital && (selectedHospital.id === h.id || hospitalKey(selectedHospital) === hospitalKey(h));

        const hospitalIcon = window.L.divIcon({
          className: 'hospital-marker',
          html: `<div style="
                    background: ${isSelected ? '#059669' : (isEmergency ? '#e11d48' : '#0284c7')};
                    color: #ffffff;
                    padding: 5px 12px;
                    border-radius: 9999px;
                    font-size: 11.5px;
                    font-weight: 800;
                    white-space: nowrap;
                    box-shadow: ${isSelected ? '0 6px 18px rgba(5,150,105,0.45)' : '0 4px 12px rgba(0,0,0,0.2)'};
                    border: 2px solid #ffffff;
                    transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                 ">
                  <span>${isEmergency ? '🚨' : '🏥'}</span>
                  <span>${safeName}</span>
                  <span style="opacity: 0.9; font-size: 10.5px; background: rgba(0,0,0,0.18); padding: 1px 6px; border-radius: 9999px;">${h.distance.toFixed(1)}km</span>
                </div>`,
          iconSize: [135, 32],
          iconAnchor: [67, 32]
        });

        const m = window.L.marker([h.lat, h.lng], { icon: hospitalIcon, zIndexOffset: isSelected ? 1000 : 0 }).addTo(map);
        
        const popupContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif; padding: 6px 4px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <strong style="font-size: 14.5px; color: #0f172a;">${safeName}</strong>
              ${h.isEmergency24h ? '<span style="background:#fee2e2; color:#be123c; font-weight:800; font-size:10.5px; padding:2px 6px; border-radius:9999px;">🚨 24시</span>' : ''}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; line-height: 1.4;">${safeAddress}</div>
            <div style="font-size: 12px; color: #059669; font-weight: 800; margin-bottom: 10px;">📍 내 위치에서 ${h.distance.toFixed(1)} km</div>
            <div>
              <a href="${safePlaceUrl}" target="_blank" rel="noopener noreferrer" style="background:#03c75a; color:#fff; padding:6px 14px; border-radius:9999px; font-size:12px; text-decoration:none; display:inline-block; font-weight:800; box-shadow: 0 2px 8px rgba(3,199,90,0.3);">
                🗺️ 네이버 길안내 바로가기
              </a>
            </div>
          </div>
        `;
        
        m.bindPopup(popupContent);
        m.on('click', () => setSelectedHospital(h));
        hospitalMarkersRef.current.push(m);
      });
    };

    loadLeaflet();
  }, [userGps, hospitals, selectedHospital]);

  // GPS 위치로 되돌리기
  const handleResetToUserGps = () => {
    if (!navigator.geolocation) {
      panToUserGps(userGps.lat, userGps.lng, userGps.name);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        const regionName = getRegionName(lat, lng);

        const newName = `${regionName} GPS (${lat}, ${lng})`;
        setUserGps({ lat, lng, name: newName });
        panToUserGps(lat, lng, newName);
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation Error:', err);
        setLocating(false);
        panToUserGps(userGps.lat, userGps.lng, userGps.name);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const panToUserGps = (lat, lng, name) => {
    if (mapInstanceRef.current) {
      isInternalMoveRef.current = true;
      mapInstanceRef.current.setView([lat, lng], 14);
    }
    const regionName = getRegionName(lat, lng);
    setMapCenter({ lat, lng, regionName });
  };

  // 키워드 및 찜 목록 필터 적용
  const displayedHospitals = useMemo(() => {
    return hospitals.filter(h => {
      if (filterBookmarksOnly && !bookmarkKeys.has(hospitalKey(h))) {
        return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchName = h.name.toLowerCase().includes(kw);
        const matchAddr = (h.address || '').toLowerCase().includes(kw);
        return matchName || matchAddr;
      }
      return true;
    });
  }, [hospitals, filterBookmarksOnly, bookmarkKeys, searchKeyword]);

  return (
    <section id="hospitals-section" style={{ padding: '36px 0 80px 0', background: 'var(--bg-main)', minHeight: '90vh' }}>
      <div className="container" style={{ maxWidth: '1280px' }}>
        
        {/* Section Header */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 13px', borderRadius: '9999px', background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12px', fontWeight: '800', marginBottom: '8px' }}>
            <span>🚨</span> 24시간 실시간 응급 병원 네트워크
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '27px', fontWeight: '900', color: '#0b0f19', letterSpacing: '-0.5px', margin: '0 0 5px 0' }}>
                주변 24시 응급 동물병원 찾기
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: '500' }}>
                지도를 드래그하면 해당 구역(신림, 사당, 강남, 여의도 등)의 24시 병원을 네이버 지역정보로 자동 탐색합니다.
              </p>
            </div>

            {/* GPS Status & Reset Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.85)', padding: '6px 14px', borderRadius: '9999px', border: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                <span>{userGps.name}</span>
              </div>
              <button
                type="button"
                onClick={handleResetToUserGps}
                disabled={locating}
                className="card-hover-lift"
                style={{
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  background: '#ffffff',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: locating ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.12)'
                }}
              >
                <span>🎯</span>
                <span>{locating ? 'GPS 수신 중...' : '내 위치로'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 Split Screen Layout */}
        <div className="hospital-split-container">
          
          
          {/* ============================================================ */}
          {/* 🌟 LEFT COLUMN: Sticky Interactive Map */}
          {/* ============================================================ */}
          <div style={{
            position: 'sticky',
            top: '96px',
            height: 'calc(100vh - 220px)',
            minHeight: '560px',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(226, 232, 240, 0.6)',
            background: '#ffffff'
          }}>
            {/* Map Canvas */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }}></div>

            {/* Top Status Floating Pill */}
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.88)',
              color: '#ffffff',
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '700',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}>
              <span style={{ color: '#38bdf8' }}>🔍 {mapCenter.regionName} 실시간 탐색</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{ color: '#4ade80', fontSize: '11.5px' }}>지도를 움직이면 자동 갱신</span>
            </div>

            {/* Selected Hospital Floating Preview Card (넉넉한 bottom 마진으로 attribution 겹침 방지) */}
            {selectedHospital && (
              <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '16px',
                right: '16px',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                padding: '14px 18px',
                borderRadius: '18px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 16px 36px -8px rgba(15, 23, 42, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: '900', fontSize: '15px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedHospital.name}
                    </span>
                    {selectedHospital.isEmergency24h && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        background: '#fee2e2',
                        color: '#be123c',
                        fontWeight: '900',
                        whiteSpace: 'nowrap'
                      }}>
                        🚨 24시
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedHospital.address} · <strong style={{ color: '#059669' }}>{selectedHospital.distance.toFixed(1)} km</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {/* Floating Card 찜 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(selectedHospital)}
                    disabled={bookmarkBusy === hospitalKey(selectedHospital)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: bookmarkKeys.has(hospitalKey(selectedHospital)) ? '#fffbeb' : '#f8fafc',
                      border: bookmarkKeys.has(hospitalKey(selectedHospital)) ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                      color: bookmarkKeys.has(hospitalKey(selectedHospital)) ? '#b45309' : '#64748b',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: bookmarkKeys.has(hospitalKey(selectedHospital)) ? '#f59e0b' : '#94a3b8' }}>
                      {bookmarkKeys.has(hospitalKey(selectedHospital)) ? '★' : '☆'}
                    </span>
                    <span>찜</span>
                  </button>

                  {selectedHospital.phone && (
                    <a
                      href={`tel:${selectedHospital.phone}`}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: '800',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      📞 전화
                    </a>
                  )}
                  <a
                    href={safeNaverMapUrl(selectedHospital.naverPlaceUrl, selectedHospital.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 15px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      whiteSpace: 'nowrap',
                      background: '#03c75a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 14px rgba(3, 199, 90, 0.3)'
                    }}
                  >
                    🗺️ 길안내
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 🌟 RIGHT COLUMN: Filter Controls & Clean Cards List */}
          {/* ============================================================ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Filter Tabs & Search Bar Box */}
            <div style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '14px 16px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setFilter24h(true); setFilterBookmarksOnly(false); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    border: 'none',
                    background: (filter24h && !filterBookmarksOnly) ? '#be123c' : '#f1f5f9',
                    color: (filter24h && !filterBookmarksOnly) ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🚨 24시 응급만
                </button>

                <button
                  type="button"
                  onClick={() => { setFilter24h(false); setFilterBookmarksOnly(false); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    border: 'none',
                    background: (!filter24h && !filterBookmarksOnly) ? '#0f172a' : '#f1f5f9',
                    color: (!filter24h && !filterBookmarksOnly) ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  전체 보기
                </button>

                {/* 🌟 찜 목록 전용 필터 탭 */}
                <button
                  type="button"
                  onClick={() => setFilterBookmarksOnly(!filterBookmarksOnly)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    border: 'none',
                    background: filterBookmarksOnly ? '#d97706' : '#f1f5f9',
                    color: filterBookmarksOnly ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '13px', color: filterBookmarksOnly ? '#ffffff' : '#d97706' }}>{filterBookmarksOnly ? '★' : '☆'}</span>
                  <span>찜한 병원 {bookmarkKeys.size > 0 && `(${bookmarkKeys.size})`}</span>
                </button>
              </div>

              {/* In-List Search Input & Result Count Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="병원명 또는 도로명/동 검색..."
                    style={{
                      width: '100%',
                      padding: '8px 32px 8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12.5px',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: '700' }}>
                  <span style={{ color: '#059669', fontWeight: '900' }}>{displayedHospitals.length}</span>곳
                </div>
              </div>
            </div>

            {/* Hospital Cards Scroll Area */}
            <div className="hospital-list-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '45px 20px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  color: '#64748b'
                }}>
                  <div style={{ fontSize: '26px', marginBottom: '6px' }}>🧭</div>
                  <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '3px', fontSize: '14px' }}>{mapCenter.regionName} 일대 병원 검색 중...</div>
                  <div style={{ fontSize: '12px' }}>네이버 실시간 지역검색으로 검증된 병원을 조회하고 있습니다.</div>
                </div>
              ) : displayedHospitals.length === 0 ? (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '45px 20px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  color: '#64748b'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏥</div>
                  <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '3px', fontSize: '14px' }}>조건에 맞는 병원이 없습니다</div>
                  <div style={{ fontSize: '12px', marginBottom: '12px' }}>지도를 이동하거나 검색어/찜 필터를 해제해 보세요.</div>
                  <button
                    type="button"
                    onClick={() => { setFilter24h(false); setFilterBookmarksOnly(false); setSearchKeyword(''); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    필터 전체 초기화
                  </button>
                </div>
              ) : (
                displayedHospitals.map((h, idx) => {
                  const isSelected = selectedHospital && (selectedHospital.id === h.id || hospitalKey(selectedHospital) === hospitalKey(h));
                  const isBookmarked = bookmarkKeys.has(hospitalKey(h));

                  return (
                    <div
                      key={h.id || hospitalKey(h) || `hosp_${idx}`}
                      onClick={() => {
                        setSelectedHospital(h);
                        if (mapInstanceRef.current && h.lat && h.lng) {
                          isInternalMoveRef.current = true;
                          mapInstanceRef.current.setView([h.lat, h.lng], 15, { animate: true });
                        }
                      }}
                      className="card-hover-lift"
                      style={{
                        padding: '16px 18px',
                        background: isSelected ? '#f0fdf4' : '#ffffff',
                        borderRadius: '16px',
                        border: isSelected ? '2px solid #059669' : '1px solid #e8edf2',
                        boxShadow: isSelected ? '0 8px 20px -4px rgba(5, 150, 105, 0.16)' : '0 2px 6px rgba(15, 23, 42, 0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative'
                      }}
                    >
                      {/* Top Row: Title & Distance Badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '15.5px',
                            fontWeight: '800',
                            color: isSelected ? '#047857' : '#0f172a',
                            letterSpacing: '-0.3px',
                            lineHeight: '1.3'
                          }}>
                            {h.name}
                          </h4>
                          {h.isEmergency24h && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '900',
                              padding: '2px 7px',
                              borderRadius: '9999px',
                              background: 'linear-gradient(135deg, #fee2e2 0%, #fecdd3 100%)',
                              color: '#be123c',
                              border: '1px solid #fca5a5'
                            }}>
                              🚨 24시 응급
                            </span>
                          )}
                        </div>

                        {/* Distance Badge */}
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: isSelected ? '#dcfce7' : '#f1f5f9',
                          color: isSelected ? '#059669' : '#475569',
                          whiteSpace: 'nowrap'
                        }}>
                          {h.distance.toFixed(1)} km
                        </span>
                      </div>

                      {/* Middle: Address */}
                      <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.4', marginBottom: '8px' }}>
                        📍 {h.address}
                      </div>

                      {/* Meta Tags: Business Hours & Naver verification */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#0284c7', fontWeight: '600', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>
                          🟢 {h.businessHours || '24시간 연중무휴'}
                        </span>
                        {h.phone && (
                          <span style={{ color: '#64748b' }}>📞 {h.phone}</span>
                        )}
                        {h.rating && (
                          <span style={{ color: '#d97706' }}>⭐️ {h.rating} ({h.reviewCount || 0})</span>
                        )}
                      </div>

                      {/* Action Button Strip */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '10px'
                      }}>
                        {/* 🌟 찜 버튼 (단골 ➜ 찜으로 전면 개편) */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleBookmark(h); }}
                          disabled={bookmarkBusy === hospitalKey(h)}
                          title={isBookmarked ? '찜 목록에서 제거' : '찜하기'}
                          style={{
                            padding: '6px 13px',
                            fontSize: '12px',
                            fontWeight: '800',
                            borderRadius: '9999px',
                            border: isBookmarked ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                            background: isBookmarked ? '#fffbeb' : '#ffffff',
                            color: isBookmarked ? '#b45309' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '13px', color: isBookmarked ? '#f59e0b' : '#94a3b8' }}>{isBookmarked ? '★' : '☆'}</span>
                          <span>찜</span>
                        </button>

                        {/* 전화 버튼 (전화번호가 실제로 있을 때만 렌더링, '안내' 버튼은 완전 제거) */}
                        {h.phone && (
                          <a
                            href={`tel:${h.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '6px 13px',
                              fontSize: '12px',
                              fontWeight: '700',
                              borderRadius: '9999px',
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#334155',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>📞</span>
                            <span>전화</span>
                          </a>
                        )}

                        {/* 네이버 길안내 버튼 */}
                        <a
                          href={safeNaverMapUrl(h.naverPlaceUrl, h.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: '800',
                            borderRadius: '9999px',
                            background: '#03c75a',
                            color: '#ffffff',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(3, 199, 90, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>🗺️</span>
                          <span>길안내</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        

        </div>
      </div>
    </section>
  );
}

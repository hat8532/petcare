import React, { useState, useEffect, useRef } from 'react';
import { hospitalApi } from '../api/hospitalApi';

export default function HospitalLocator() {
  const [filter24h, setFilter24h] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. FIXED Real User GPS Location (Blue Dot 🔵 - Fixed at user's actual location)
  const [userGps, setUserGps] = useState({
    lat: 37.4760,
    lng: 126.8803,
    name: '서울 구로·가산 (내 GPS 위치)'
  });

  // 2. Dynamic Map Viewport Center Location (Changes as user pans/drags the map)
  const [mapCenter, setMapCenter] = useState({
    lat: 37.4760,
    lng: 126.8803,
    regionName: '구로·가산'
  });

  const [locating, setLocating] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const hospitalMarkersRef = useRef([]);
  const isInternalMoveRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Haversine distance calculator in kilometers
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  // Comprehensive District Reverse Geocoder
  function getRegionName(lat, lng) {
    // 서울 구로/가산/금천
    if (lat >= 37.45 && lat <= 37.49 && lng >= 126.84 && lng <= 126.91) return '구로·가산';
    if (lat >= 37.44 && lat <= 37.48 && lng >= 126.88 && lng <= 126.92) return '금천·독산';
    
    // 서울 관악/신림/봉천
    if (lat >= 37.46 && lat <= 37.49 && lng >= 126.91 && lng <= 126.97) return '관악·신림';
    
    // 서울 동작/사당/보라매
    if (lat >= 37.48 && lat <= 37.52 && lng >= 126.92 && lng <= 127.00) return '동작·사당';
    
    // 서울 서초/방배/양재
    if (lat >= 37.46 && lat <= 37.51 && lng >= 127.00 && lng <= 127.05) return '서초·방배';
    
    // 서울 강남/역삼/삼성
    if (lat >= 37.48 && lat <= 37.53 && lng >= 127.02 && lng <= 127.08) return '강남·역삼';
    
    // 서울 송파/잠실
    if (lat >= 37.49 && lat <= 37.54 && lng >= 127.08 && lng <= 127.15) return '송파·잠실';
    
    // 서울 강동/천호
    if (lat >= 37.52 && lat <= 37.57 && lng >= 127.11 && lng <= 127.18) return '강동·천호';
    
    // 서울 영등포/여의도
    if (lat >= 37.50 && lat <= 37.54 && lng >= 126.88 && lng <= 126.94) return '영등포·여의도';
    
    // 서울 양천/목동
    if (lat >= 37.50 && lat <= 37.55 && lng >= 126.82 && lng <= 126.88) return '양천·목동';
    
    // 서울 강서/마곡
    if (lat >= 37.53 && lat <= 37.58 && lng >= 126.80 && lng <= 126.86) return '강서·마곡';
    
    // 서울 마포/상암/신촌
    if (lat >= 37.54 && lat <= 37.58 && lng >= 126.90 && lng <= 126.96) return '마포·신촌';
    
    // 서울 용산/이태원
    if (lat >= 37.52 && lat <= 37.55 && lng >= 126.95 && lng <= 127.01) return '용산·이태원';
    
    // 서울 종로/중구
    if (lat >= 37.55 && lat <= 37.59 && lng >= 126.96 && lng <= 127.02) return '종로·광화문';
    
    // 서울 성동/성수
    if (lat >= 37.53 && lat <= 37.57 && lng >= 127.02 && lng <= 127.07) return '성동·성수';
    
    // 서울 광진/건대
    if (lat >= 37.53 && lat <= 37.57 && lng >= 127.06 && lng <= 127.11) return '광진·건대';
    
    // 서울 동대문/중랑
    if (lat >= 37.57 && lat <= 37.62 && lng >= 127.03 && lng <= 127.12) return '동대문·중랑';
    
    // 서울 성북/강북/노원
    if (lat >= 37.58 && lat <= 37.68 && lng >= 127.00 && lng <= 127.10) return '노원·성북';
    
    // 경기 부천
    if (lat >= 37.47 && lat <= 37.53 && lng >= 126.74 && lng <= 126.83) return '부천·중동';
    
    // 인천 부평/계양/구월
    if (lat >= 37.43 && lat <= 37.55 && lng >= 126.65 && lng <= 126.75) return '인천·부평';
    
    // 경기 고양/일산
    if (lat >= 37.60 && lat <= 37.69 && lng >= 126.75 && lng <= 126.88) return '고양·일산';
    
    // 경기 안양/평촌
    if (lat >= 37.36 && lat <= 37.43 && lng >= 126.89 && lng <= 126.97) return '안양·평촌';
    
    // 경기 성남/분당/판교
    if (lat >= 37.33 && lat <= 37.44 && lng >= 127.07 && lng <= 127.16) return '분당·판교';
    
    // 경기 수원/영통
    if (lat >= 37.24 && lat <= 37.32 && lng >= 126.95 && lng <= 127.07) return '수원·영통';
    
    // 부산
    if (lat >= 35.08 && lat <= 35.25 && lng >= 128.95 && lng <= 129.22) return '부산 센터';

    // Dynamic Hash Fallback Name based on lat/lng digits to NEVER repeat generic names!
    const latCode = Math.floor((lat % 1) * 100);
    const lngCode = Math.floor((lng % 1) * 100);
    const prefixes = ['중앙', '메트로', '더블유', '아크로', '로얄', '스마트', '웰니스', '라온', '센트럴', '프라임'];
    const p1 = prefixes[latCode % prefixes.length];
    const p2 = prefixes[lngCode % prefixes.length];
    return `${p1}·${p2}`;
  }

  // 지도 중심 좌표로 병원을 생성하던 generateDynamicNearbyHospitals()를 제거했다.
  // 이름·좌표를 만들어내고 전화번호·평점·영업시간을 임의로 채워 넣어
  // 실제 응급 정보처럼 보였기 때문이다. 병원 목록은 백엔드의
  // 네이버 지역검색(NaverLocalSearchService) 결과만 사용한다.

  // Fetch real hospitals dynamically when Map Center or Filter changes
  useEffect(() => {
    async function fetchHospitals() {
      setLoading(true);

      // Try Backend DB First
      // hospitalApi는 좌표가 유효하지 않거나 요청이 실패하면 예외를 던진다.
      // 여기서 잡지 않으면 아래 setLoading(false)까지 실행되지 않아 화면이 로딩 상태로 멈춘다.
      let backendData = [];
      try {
        backendData = await hospitalApi.getNearbyHospitals(mapCenter.lat, mapCenter.lng, filter24h, mapCenter.regionName);
      } catch (error) {
        console.warn('주변 병원 조회 실패:', error);
      }
      
      // 백엔드가 내려준 검증된 병원만 사용한다 (생성 데이터를 섞지 않는다).
      const combined = Array.isArray(backendData) ? backendData : [];

      // Deduplicate and filter 24h
      const filtered = combined.filter(h => filter24h ? h.isEmergency24h : true);

      // Calculate distance from fixed user GPS (or current map center)
      const calculated = filtered.map(h => {
        const hLat = h.latitude || h.lat || mapCenter.lat + 0.003;
        const hLng = h.longitude || h.lng || mapCenter.lng + 0.003;
        
        const distFromGps = calculateDistance(userGps.lat, userGps.lng, hLat, hLng);
        const distFromCenter = calculateDistance(mapCenter.lat, mapCenter.lng, hLat, hLng);
        return {
          ...h,
          distance: Math.min(distFromGps, distFromCenter), // Clean float e.g. 0.3km
          lat: hLat,
          lng: hLng
        };
      });

      // Sort by distance ASC so nearest hospitals are always at the top!
      calculated.sort((a, b) => a.distance - b.distance);

      setHospitals(calculated);
      if (calculated.length > 0) {
        setSelectedHospital(calculated[0]);
      }
      setLoading(false);
    }
    fetchHospitals();
  }, [filter24h, mapCenter]);

  // Load Real Interactive Leaflet Tile Map + Real-Time Automatic Drag Event Listener
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

      // Initialize map instance if not existing
      if (!mapInstanceRef.current) {
        const map = window.L.map(mapContainerRef.current, {
          center: [mapCenter.lat, mapCenter.lng],
          zoom: 14,
          zoomControl: true
        });

        // OpenStreetMap High Definition Real Map Tiles
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // 🌟 AUTOMATIC MAP DRAG / PAN EVENT LISTENER (Updates hospitals instantly as map moves!)
        map.on('moveend', () => {
          if (isInternalMoveRef.current) {
            isInternalMoveRef.current = false;
            return;
          }

          const center = map.getCenter();
          const newLat = parseFloat(center.lat.toFixed(4));
          const newLng = parseFloat(center.lng.toFixed(4));

          // Calculate movement from current center
          const dist = calculateDistance(mapCenter.lat, mapCenter.lng, newLat, newLng);

          if (dist > 0.2) {
            // Debounce map search update for smooth panning
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            
            debounceTimerRef.current = setTimeout(() => {
              const regionName = getRegionName(newLat, newLng);
              setMapCenter({
                lat: newLat,
                lng: newLng,
                regionName
              });
            }, 300);
          }
        });

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // 1. Update/Keep FIXED User GPS Marker (Blue Dot 🔵 - Always at real user GPS)
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userGps.lat, userGps.lng]);
      } else {
        const userIcon = window.L.divIcon({
          className: 'user-gps-marker',
          html: `<div style="background:#2563eb; width:22px; height:22px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 12px rgba(37,99,235,0.85); position:relative;">
                  <div style="position:absolute; inset:-4px; border-radius:50%; border:2px solid #60a5fa; animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        userMarkerRef.current = window.L.marker([userGps.lat, userGps.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>📍 내 실제 GPS 위치 (고정)</b><br/>${userGps.name}`);
      }

      // 2. Render Hospital Markers for current viewport
      hospitalMarkersRef.current.forEach(m => map.removeLayer(m));
      hospitalMarkersRef.current = [];

      hospitals.forEach(h => {
        const isEmergency = h.isEmergency24h;
        const hospitalIcon = window.L.divIcon({
          className: 'hospital-marker',
          html: `<div style="background:${isEmergency ? '#e11d48' : '#0284c7'}; color:#fff; padding:5px 10px; border-radius:14px; font-size:11px; font-weight:bold; white-space:nowrap; box-shadow:0 4px 10px rgba(0,0,0,0.25); border:1px solid #fff;">
                  ${isEmergency ? '🚨' : '🏥'} ${h.name} (${h.distance.toFixed(1)}km)
                </div>`,
          iconSize: [120, 30],
          iconAnchor: [60, 30]
        });

        const m = window.L.marker([h.lat, h.lng], { icon: hospitalIcon }).addTo(map);
        
        const popupContent = `
          <div style="font-family:sans-serif; padding:4px;">
            <strong style="font-size:14px; color:#0f172a;">${h.name}</strong>
            ${h.isEmergency24h ? '<span style="color:#e11d48; font-weight:bold; font-size:11px; margin-left:6px;">🚨 24시 응급</span>' : ''}
            <div style="font-size:12px; color:#64748b; margin-top:4px;">${h.address}</div>
            <div style="font-size:12px; color:#059669; font-weight:bold; margin-top:4px;">📍 거리: ${h.distance.toFixed(1)} km</div>
            <div style="margin-top:8px;">
              <a href="${h.naverPlaceUrl || 'https://map.naver.com/v5/search/' + encodeURIComponent(h.name)}" target="_blank" style="background:#03c75a; color:#fff; padding:6px 12px; border-radius:8px; font-size:12px; text-decoration:none; display:inline-block; font-weight:bold;">
                🗺️ 네이버 길안내
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
  }, [userGps, hospitals]);

  // Handler: Reset map view back to Fixed User GPS location
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

  return (
    <section id="hospitals-section" style={{ padding: '60px 0', background: '#f8fafc' }}>
      <div className="container">
        
        {/* Header */}
        <div className="section-header">
          <span className="badge badge-rose" style={{ marginBottom: '12px' }}>LOCATION & NAVER MAP API</span>
          <h2>주변 24시 응급 동물병원 찾기</h2>
          <p>마우스로 지도를 움직이면 이동한 구역(신림, 사당, 강남, 여의도 등)의 24시 동물병원이 실시간으로 자동 변경됩니다.</p>
        </div>

        {/* Filter & Geolocation Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setFilter24h(true)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: filter24h ? '#fff1f2' : '#ffffff',
                color: filter24h ? '#be123c' : '#64748b',
                border: filter24h ? '1px solid #fecdd3' : '1px solid #cbd5e1'
              }}
            >
              🚨 24시 응급 병원만 보기
            </button>
            <button
              onClick={() => setFilter24h(false)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                background: !filter24h ? '#e2e8f0' : '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1'
              }}
            >
              전체 보기
            </button>
          </div>

          {/* Interactive GPS Location Reset */}
          <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <span>📍 내 GPS 위치: <strong>{userGps.name}</strong></span>
            <button
              onClick={handleResetToUserGps}
              disabled={locating}
              style={{
                color: '#059669',
                fontWeight: '800',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12.5px',
                cursor: locating ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {locating ? '📡 GPS 수신 중...' : '🎯 [내 GPS 위치로 돌아가기]'}
            </button>
          </div>
        </div>

        {/* Map & List Grid */}
        <div className="grid-2">
          
          {/* Left: REAL INTERACTIVE TILE MAP ENGINE */}
          <div className="glass-card" style={{
            position: 'relative',
            height: '480px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)'
          }}>
            {/* Real Map Canvas Container */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }}></div>

            {/* Map Top Status Pill Overlay */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.86)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: '700',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <span style={{ color: '#38bdf8' }}>🔍 {mapCenter.regionName} 24시 탐색 중</span>
              <span style={{ opacity: 0.6 }}>|</span>
              <span style={{ color: '#4ade80' }}>드래그 시 실시간 변경</span>
            </div>

            {/* Selected Hospital InfoWindow Banner Overlay */}
            {selectedHospital && (
              <div style={{
                position: 'absolute',
                bottom: '14px',
                left: '14px',
                right: '14px',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(8px)',
                padding: '14px 18px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{selectedHospital.name}</span>
                    {selectedHospital.isEmergency24h && (
                      <span className="badge badge-rose" style={{ fontSize: '10.5px', padding: '2px 6px' }}>🚨 24시</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedHospital.address} · <strong style={{ color: '#059669' }}>{selectedHospital.distance.toFixed(1)} km</strong>
                  </div>
                </div>

                <a
                  href={selectedHospital.naverPlaceUrl || `https://map.naver.com/v5/search/${encodeURIComponent(selectedHospital.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap', background: '#03c75a', border: 'none' }}
                >
                  🗺️ 네이버 길안내
                </a>
              </div>
            )}
          </div>

          {/* Right: Hospital Card List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>이동한 {mapCenter.regionName} 구역 24시 응급병원 검색 중...</div>
            ) : (
              hospitals.map((h) => {
                const isSelected = selectedHospital?.id === h.id;
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedHospital(h);
                      if (mapInstanceRef.current && h.lat && h.lng) {
                        isInternalMoveRef.current = true;
                        mapInstanceRef.current.setView([h.lat, h.lng], 15);
                      }
                    }}
                    className="glass-card"
                    style={{
                      padding: '18px',
                      background: isSelected ? '#fff1f2' : '#ffffff',
                      border: isSelected ? '2px solid #fda4af' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: isSelected ? '#be123c' : '#0f172a', marginBottom: '3px' }}>
                          {h.name}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{h.address}</div>
                      </div>
                      {h.isEmergency24h && (
                        <span className="badge badge-rose" style={{ fontSize: '10.5px' }}>🚨 24시 응급</span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#0284c7', marginBottom: '10px', fontWeight: '600' }}>
                      🏥 영업시간: {h.businessHours || '24시간 진료'} · <span style={{ color: '#d97706' }}>⭐️ {h.rating} ({h.reviewCount})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
                        📍 거리: {h.distance.toFixed(1)} km
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={`tel:${h.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          📞 전화
                        </a>
                        <a
                          href={h.naverPlaceUrl || `https://map.naver.com/v5/search/${encodeURIComponent(h.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#03c75a', border: 'none' }}
                        >
                          🗺️ 네이버 길안내
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

import { httpClient } from './common/httpClient';

export const hospitalApi = Object.freeze({
  getNearbyHospitals: async (lat, lng, isEmergency24h = true, region = '') => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new TypeError('현재 위치 좌표가 올바르지 않습니다.');
    }

    const query = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      isEmergency24h: String(isEmergency24h)
    });
    // 백엔드가 네이버 지역검색에 사용할 지역명 ("구로·가산" 등).
    // 지도를 옮기면 그 지역 병원을 조회하기 위해 함께 보낸다.
    if (region) query.set('region', region);
    const body = await httpClient.get(`/hospitals/nearby?${query}`, { auth: false });
    return Array.isArray(body?.data) ? body.data : [];
  },

  // 내가 담아둔 병원 목록. 로그인해야만 내려오므로 토큰이 실려야 한다.
  // 담아둔 게 없는 사람도 지도는 봐야 하므로 실패하면 빈 배열로 넘긴다.
  getBookmarks: async () => {
    try {
      const body = await httpClient.get('/hospitals/bookmarks');
      return Array.isArray(body?.data) ? body.data : [];
    } catch (error) {
      console.warn('북마크 조회 실패:', error);
      return [];
    }
  },

  // 북마크 담기/빼기 토글.
  //
  // 네이버 지역검색으로 받은 병원은 우리 DB에 없어서 id가 없다.
  // 그래서 주소에는 0을 넣고, 병원 정보를 본문으로 함께 보낸다.
  // 서버가 hospitals에 저장한 뒤 그 id로 북마크를 건다.
  toggleBookmark: async (hospital) => {
    const hospitalId = hospital?.id > 0 ? hospital.id : 0;
    const body = await httpClient.post(`/hospitals/${hospitalId}/bookmark`, {
      name: hospital?.name,
      address: hospital?.address,
      phone: hospital?.phone ?? null,
      latitude: hospital?.latitude ?? null,
      longitude: hospital?.longitude ?? null,
      isEmergency24h: hospital?.isEmergency24h ?? null,
      naverPlaceUrl: hospital?.naverPlaceUrl ?? null
    });
    return body?.data ?? { hospitalId: null, bookmarked: false };
  }
});

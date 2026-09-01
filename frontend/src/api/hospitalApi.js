import { httpClient } from './common/httpClient';

export const hospitalApi = Object.freeze({
  getNearbyHospitals: async (lat, lng, isEmergency24h = true) => {
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
    const body = await httpClient.get(`/hospitals/nearby?${query}`, { auth: false });
    return Array.isArray(body?.data) ? body.data : [];
  }
});

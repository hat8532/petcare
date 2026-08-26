import { httpClient } from './common/httpClient';

export const hospitalApi = Object.freeze({
  getNearbyHospitals: async (lat = 37.5507, lng = 126.9408, isEmergency24h = true) => {
    try {
      const query = new URLSearchParams({ lat, lng, isEmergency24h });
      const body = await httpClient.get(`/hospitals/nearby?${query}`, { auth: false });
      return body?.data || [];
    } catch (error) {
      console.warn('Backend API error:', error);
      return [];
    }
  }
});

import { httpClient } from './common/httpClient';

export const timelineApi = Object.freeze({
  getTimelineByPet: async (petId = 1) => {
    try {
      const body = await httpClient.get(`/timelines/pet/${petId}`);
      return body?.data;
    } catch (error) {
      console.warn('Backend API error:', error);
      return null;
    }
  }
});

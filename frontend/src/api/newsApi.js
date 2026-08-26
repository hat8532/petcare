import { httpClient } from './common/httpClient';

export const newsApi = Object.freeze({
  getNews: async (query = '반려동물', start = 1, display = 10) => {
    try {
      const search = new URLSearchParams({ query, start, display });
      const body = await httpClient.get(`/news?${search}`, { auth: false });
      return body?.data || [];
    } catch (error) {
      console.warn('Backend API error:', error);
      return [];
    }
  }
});

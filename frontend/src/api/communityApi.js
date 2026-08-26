import { httpClient } from './common/httpClient';

const publicRequest = Object.freeze({ auth: false });

export const communityApi = Object.freeze({
  getCommunityPosts: async () => {
    try {
      const body = await httpClient.get('/community', publicRequest);
      return body?.data || [];
    } catch (error) {
      console.warn('Backend API error:', error);
      return [];
    }
  },

  createCommunityPost: async (payload) => {
    const body = await httpClient.post('/community', payload, publicRequest);
    return body?.data;
  }
});

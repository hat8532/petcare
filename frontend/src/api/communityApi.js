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

  // 글 하나를 상세 조회한다. GET /api/v1/community/{id}
  // 목록과 달리 실패해도 빈 배열로 넘길 수 없어서(보여줄 글이 없음)
  // 예외를 그대로 올려보내고 화면에서 처리한다.
  getCommunityPost: async (id) => {
    const body = await httpClient.get(`/community/${id}`, publicRequest);
    return body?.data ?? null;
  },

  createCommunityPost: async (payload) => {
    const body = await httpClient.post('/community', payload);
    return body?.data;
  }
});

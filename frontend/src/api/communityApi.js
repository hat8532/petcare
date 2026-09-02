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
  },

  // 한 게시글의 댓글 목록. GET /api/v1/community/{postId}/comments
  // 댓글은 없을 수도 있는 것이라 실패하면 빈 배열로 넘긴다.
  getComments: async (postId) => {
    try {
      const body = await httpClient.get(`/community/${postId}/comments`, publicRequest);
      return body?.data || [];
    } catch (error) {
      console.warn('댓글 조회 실패:', error);
      return [];
    }
  },

  // 댓글 작성. publicRequest를 빼야 토큰이 함께 실려 간다.
  // 401(로그인 만료) 같은 응답을 화면에서 구분해야 해서 예외를 그대로 올려보낸다.
  createComment: async (postId, content) => {
    const body = await httpClient.post(`/community/${postId}/comments`, { content });
    return body?.data;
  },

  // 댓글 삭제. 본인 것이 아니면 서버가 403을 돌려준다.
  deleteComment: async (postId, commentId) => {
    await httpClient.delete(`/community/${postId}/comments/${commentId}`);
  }
});

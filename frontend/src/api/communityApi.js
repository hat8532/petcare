import { httpClient } from './common/httpClient';

const publicRequest = Object.freeze({ auth: false });

export const communityApi = Object.freeze({
  // 글 목록. 페이지 단위로 잘라서 받는다.
  // 목록 배열만이 아니라 hasNext 같은 페이지 정보도 화면이 써야 해서 응답을 통째로 넘긴다.
  // 실패해도 화면이 터지지 않도록 빈 페이지 모양을 그대로 맞춰서 돌려준다.
  getCommunityPosts: async ({ page = 0, size = 10, keyword = '' } = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    // 빈 검색어까지 붙여 보내면 주소가 지저분해진다. 값이 있을 때만 넣는다.
    if (keyword.trim()) params.set('keyword', keyword.trim());

    try {
      const body = await httpClient.get(`/community?${params}`, publicRequest);
      return {
        data: body?.data || [],
        page: body?.page ?? 0,
        totalCount: body?.totalCount ?? 0,
        hasNext: body?.hasNext ?? false
      };
    } catch (error) {
      console.warn('Backend API error:', error);
      return { data: [], page: 0, totalCount: 0, hasNext: false };
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

  // 글 수정. 본인 글이 아니면 서버가 403을 돌려준다.
  updateCommunityPost: async (id, payload) => {
    const body = await httpClient.put(`/community/${id}`, payload);
    return body?.data;
  },

  // 글 삭제. 딸린 댓글·좋아요는 DB가 함께 지운다.
  deleteCommunityPost: async (id) => {
    await httpClient.delete(`/community/${id}`);
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
  },

  // 글쓰기 화면에서 첨부할 수 있는 내 AI 진단 리포트 목록.
  // 로그인해야만 내려오므로 publicRequest를 쓰지 않는다(토큰이 실려야 한다).
  // 진단 기록이 없는 사람도 글은 써야 하므로 실패하면 빈 배열로 넘긴다.
  getMyReports: async () => {
    try {
      const body = await httpClient.get('/community/my-reports');
      return body?.data || [];
    } catch (error) {
      console.warn('첨부 가능한 리포트 조회 실패:', error);
      return [];
    }
  },

  // 좋아요 개수와 내가 눌렀는지. 비로그인이면 liked는 항상 false다.
  // publicRequest를 쓰지 않는 이유: 토큰이 있어야 서버가 liked를 판단할 수 있다.
  // 로그인 전에는 토큰이 없어도 200이 오므로 그대로 두면 된다.
  getLikes: async (postId) => {
    try {
      const body = await httpClient.get(`/community/${postId}/likes`);
      return body?.data ?? { count: 0, liked: false };
    } catch (error) {
      console.warn('좋아요 조회 실패:', error);
      return { count: 0, liked: false };
    }
  },

  // 같은 주소로 누르면 켜지고 다시 누르면 꺼진다. 바뀐 결과를 서버가 돌려준다.
  toggleLike: async (postId) => {
    const body = await httpClient.post(`/community/${postId}/likes`);
    return body?.data ?? { count: 0, liked: false };
  }
});

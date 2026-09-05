import { httpClient } from './common/httpClient';

export const userApi = Object.freeze({
  /**
   * 내 상세 정보 조회
   */
  getMyProfile: async () => {
    const res = await httpClient.get('/users/me');
    return res?.data;
  },

  /**
   * 닉네임 변경
   * @param {string} nickname
   */
  updateNickname: async (nickname) => {
    const res = await httpClient.put('/users/me/nickname', { nickname });
    return res;
  },

  /**
   * 비밀번호 변경 (일반 로컬 회원 전용)
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  updatePassword: async (currentPassword, newPassword) => {
    const res = await httpClient.put('/users/me/password', { currentPassword, newPassword });
    return res;
  }
});

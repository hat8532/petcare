const BASE_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('petcare_token');
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * 401(Unauthorized) 감지 시 Refresh Token으로 새 Access Token을 자동 재발급받고
 * 원본 요청을 1회 재시도하는 인터셉터 래퍼
 */
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (newToken) => {
  refreshSubscribers.map((cb) => cb(newToken));
  refreshSubscribers = [];
};

const fetchWithAuth = async (url, options = {}) => {
  const headers = getAuthHeaders(options.headers || {});
  const config = { ...options, headers };

  let response = await fetch(url, config);

  // 401 Unauthorized 발생 시 Silent Refresh 시도
  if (response.status === 401 && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
    const refreshToken = localStorage.getItem('petcare_refresh_token');

    if (!refreshToken) {
      localStorage.removeItem('petcare_token');
      localStorage.removeItem('petcare_user');
      return response;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        const refreshData = await refreshRes.json();

        if (refreshRes.ok && refreshData.accessToken) {
          localStorage.setItem('petcare_token', refreshData.accessToken);
          if (refreshData.refreshToken) {
            localStorage.setItem('petcare_refresh_token', refreshData.refreshToken);
          }
          isRefreshing = false;
          onTokenRefreshed(refreshData.accessToken);

          // 새 토큰으로 원본 요청 재시도
          config.headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
          return await fetch(url, config);
        } else {
          // Refresh Token도 만료되었거나 무효함
          isRefreshing = false;
          localStorage.removeItem('petcare_token');
          localStorage.removeItem('petcare_refresh_token');
          localStorage.removeItem('petcare_user');
          return response;
        }
      } catch (err) {
        isRefreshing = false;
        return response;
      }
    } else {
      // 이미 갱신 중인 경우 대기 후 재시도
      return new Promise((resolve) => {
        subscribeTokenRefresh(async (newToken) => {
          config.headers['Authorization'] = `Bearer ${newToken}`;
          resolve(await fetch(url, config));
        });
      });
    }
  }

  return response;
};

export const apiClient = {
  // 0. Auth & Account Management
  signup: async (signupPayload) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '회원가입 실패');
      }
      return data;
    } catch (e) {
      console.warn('Backend Auth signup error:', e);
      throw e;
    }
  },

  login: async (loginPayload) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '로그인 실패');
      }
      return data;
    } catch (e) {
      console.warn('Backend Auth login error:', e);
      throw e;
    }
  },

  // ⑤ 이메일 중복 확인
  checkEmail: async (email) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
      return await res.json();
    } catch (e) {
      console.warn('Backend check email error:', e);
      return { available: false, message: '중복 확인 통신 실패' };
    }
  },

  // ⑤ 닉네임 중복 확인
  checkNickname: async (nickname) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      return await res.json();
    } catch (e) {
      console.warn('Backend check nickname error:', e);
      return { available: false, message: '중복 확인 통신 실패' };
    }
  },

  // ⑦ 로그아웃
  logout: async () => {
    try {
      await fetchWithAuth(`${BASE_URL}/auth/logout`, { method: 'POST' });
    } catch (e) {
      console.warn('Logout request warning:', e);
    } finally {
      localStorage.removeItem('petcare_token');
      localStorage.removeItem('petcare_refresh_token');
      localStorage.removeItem('petcare_user');
    }
  },

  // ⑦ 회원 탈퇴 (Soft Delete)
  withdraw: async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/auth/withdraw`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '탈퇴 처리에 실패했습니다.');
      }
      localStorage.removeItem('petcare_token');
      localStorage.removeItem('petcare_refresh_token');
      localStorage.removeItem('petcare_user');
      return data;
    } catch (e) {
      console.warn('Withdraw error:', e);
      throw e;
    }
  },

  // ⑧ 비밀번호 찾기 (임시 비밀번호 발급)
  forgotPassword: async (email) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '비밀번호 찾기 요청 실패');
      }
      return data;
    } catch (e) {
      console.warn('Forgot password error:', e);
      throw e;
    }
  },

  // 1. Pets (Protected API with Silent Refresh)
  getPetsByUser: async (userId = 1) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pets/user/${userId}`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('Backend API error on fetching pets:', e);
      return [];
    }
  },

  createPet: async (petPayload) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pets`, {
        method: 'POST',
        body: JSON.stringify(petPayload)
      });
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.warn('Backend API error on pet creation:', e);
      throw e;
    }
  },

  updatePet: async (petId, petPayload) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pets/${petId}`, {
        method: 'PUT',
        body: JSON.stringify(petPayload)
      });
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.warn('Backend API error on pet update:', e);
      return { id: petId, ...petPayload };
    }
  },

  deletePet: async (petId) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pets/${petId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.warn('Backend API error on pet deletion:', e);
      return true;
    }
  },

  // 2. AI Diagnosis
  runDiagnosis: async (payload) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/diagnosis/analyze`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.warn('Backend API error:', e);
      throw e;
    }
  },

  // 3. Timeline Compare
  getTimelineByPet: async (petId = 1) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/timelines/pet/${petId}`);
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.warn('Backend API error:', e);
      return null;
    }
  },

  // 4. Hospitals (Location-based)
  getNearbyHospitals: async (lat = 37.5507, lng = 126.9408, isEmergency24h = true) => {
    try {
      const url = `${BASE_URL}/hospitals/nearby?lat=${lat}&lng=${lng}&isEmergency24h=${isEmergency24h}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('Backend API error:', e);
      return [];
    }
  },

  // 5. News
  getNews: async (query = '반려동물', start = 1, display = 10) => {
    try {
      const res = await fetch(`${BASE_URL}/news?query=${encodeURIComponent(query)}&start=${start}&display=${display}`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('Backend API error:', e);
      return [];
    }
  },

  // 6. Community Posts
  getCommunityPosts: async () => {
    try {
      const res = await fetch(`${BASE_URL}/community`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('Backend API error:', e);
      return [];
    }
  },

  createCommunityPost: async (postPayload) => {
    try {
      const res = await fetch(`${BASE_URL}/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload)
      });
      const data = await res.json();
      return data.data;
    } catch(e) {
      console.warn('Backend API error on community post creation', e);
      throw e;
    }
  }
};

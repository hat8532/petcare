const BASE_URL = 'http://localhost:8080/api/v1';

export const apiClient = {
  // 1. Pets (Fetch strictly real DB pets for user)
  getPetsByUser: async (userId = 1) => {
    try {
      const res = await fetch(`${BASE_URL}/pets/user/${userId}`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('Backend API error on fetching pets:', e);
      return [];
    }
  },

  createPet: async (petPayload) => {
    try {
      const res = await fetch(`${BASE_URL}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
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
      const res = await fetch(`${BASE_URL}/diagnosis/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${BASE_URL}/timelines/pet/${petId}`);
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
  getNews: async () => {
    try {
      const res = await fetch(`${BASE_URL}/news`);
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
  }
};

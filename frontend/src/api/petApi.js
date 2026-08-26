import { httpClient } from './common/httpClient';

export const petApi = Object.freeze({
  getPetsByUser: async (userId = 1) => {
    try {
      const body = await httpClient.get(`/pets/user/${userId}`);
      return body?.data || [];
    } catch (error) {
      console.warn('Backend API error on fetching pets:', error);
      return [];
    }
  },

  createPet: async (payload) => {
    const body = await httpClient.post('/pets', payload);
    return body?.data;
  },

  updatePet: async (petId, payload) => {
    try {
      const body = await httpClient.put(`/pets/${petId}`, payload);
      return body?.data;
    } catch (error) {
      console.warn('Backend API error on pet update:', error);
      return { id: petId, ...payload };
    }
  },

  deletePet: async (petId) => {
    try {
      const body = await httpClient.delete(`/pets/${petId}`);
      return body?.data;
    } catch (error) {
      console.warn('Backend API error on pet deletion:', error);
      return true;
    }
  }
});

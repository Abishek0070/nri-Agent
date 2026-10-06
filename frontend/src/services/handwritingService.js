import api from './api';

export const handwritingService = {
  getLetters: async (language) => {
    try {
      const response = await api.get(`/handwriting/letters?language=${language}`);
      return response.data;
    } catch (error) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error(error.message);
    }
  },

  evaluateHandwriting: async (letterId, imageFile) => {
    const formData = new FormData();
    formData.append('letter_id', letterId);
    formData.append('image', imageFile);

    try {
      const response = await api.post('/handwriting/evaluate', formData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error(error.message || "Failed to evaluate handwriting.");
    }
  }
};

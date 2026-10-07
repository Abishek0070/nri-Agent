import api from './api';

export const userService = {
  async getProfile() {
    const response = await api.get('/user/profile');
    return response.data;
  },

  async updateLanguage(language) {
    const response = await api.put('/user/language', { language });
    return response.data;
  },

  async getStamps() {
    const response = await api.get('/user/stamps');
    return response.data;
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const challengeService = {
  createChallenge: async (data) => {
    const res = await fetch(`${API_URL}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getChallenge: async (challengeId) => {
    const res = await fetch(`${API_URL}/challenges/${challengeId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  joinChallenge: async (challengeId, nickname) => {
    const res = await fetch(`${API_URL}/challenges/${challengeId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  startChallenge: async (challengeId) => {
    const res = await fetch(`${API_URL}/challenges/${challengeId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getNextQuestion: async (challengeId, participantId) => {
    const res = await fetch(`${API_URL}/challenges/${challengeId}/question?participant_id=${participantId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  submitAnswer: async (challengeId, data) => {
    const res = await fetch(`${API_URL}/challenges/${challengeId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getResults: async (challengeId) => {
    const res = await fetch(`${API_URL}/challenges/${challengeId}/results`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  createWebSocketUrl: (challengeId) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Remove http:// or https:// from API_URL
    const host = API_URL.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${host}/challenges/${challengeId}/ws`;
  }
};

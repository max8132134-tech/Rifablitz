// ===== Firebase / Backend Bridge =====
// Detect if running locally or on Render
const API_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : `${window.location.origin}/api`;

const DB = {
  // Authentication & Users
  async saveUser(user) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en el registro');
      }
      return await response.json();
    } catch (error) {
      console.error('SaveUser Error:', error);
      throw error;
    }
  },

  getCurrentUser() {
    const data = localStorage.getItem('rifas_current_user');
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('rifas_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rifas_current_user');
    }
  },

  // Raffles
  async getRaffles() {
    try {
      const response = await fetch(`${API_URL}/raffles`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  async getRaffle(id) {
    try {
      const response = await fetch(`${API_URL}/raffles/${id}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  }
};

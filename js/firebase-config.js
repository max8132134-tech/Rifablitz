// Firebase Configuration - DEMO MODE
// Replace these with your real Firebase config for production
const FIREBASE_CONFIG = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Demo mode flag - set to false when using real Firebase
const DEMO_MODE = true;

// ===== Database Helper (API based) =====
const API_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : `${window.location.origin}/api`;

const DB = {
  async getUsers() {
    // Note: We might not need this client-side anymore as the server handles this
    const res = await fetch(`${API_URL}/users`);
    return await res.json();
  },

  async saveUser(user) {
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!response.ok) throw new Error('Error saving user');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  getRaffles() {
    return JSON.parse(localStorage.getItem('rifas_raffles') || '[]');
  },

  saveRaffles(raffles) {
    localStorage.setItem('rifas_raffles', JSON.stringify(raffles));
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

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
};

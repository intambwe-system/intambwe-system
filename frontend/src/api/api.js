import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL;

// Create an axios instance with a base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});



export default api;
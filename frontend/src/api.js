import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
      ? "https://omission-crafting-backend.onrender.com"
      : "http://localhost:5001"),
});

export default api;

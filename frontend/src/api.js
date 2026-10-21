import axios from "axios";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const api = axios.create({
  baseURL: isLocalhost
    ? "http://localhost:5001"
    : import.meta.env.VITE_API_URL || "https://omission-crafting-backend.onrender.com",
});

export default api;

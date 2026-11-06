import axios from "axios";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1" ||
    window.location.hostname === "[::1]" ||
    window.location.port === "5173" ||
    window.location.port === "5174" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10."));

const api = axios.create({
  baseURL: isLocalhost
    ? "http://localhost:5001"
    : import.meta.env.VITE_API_URL || "https://omission-crafting-backend.onrender.com",
});

export default api;

import axios from "axios";

const getBaseURL = () => {
  if (typeof window === "undefined") {
    return process.env.VITE_API_URL || "http://localhost:5001";
  }

  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.endsWith(".local");

  if (isLocal) {
    const targetHost = (hostname === "::1" || hostname === "[::1]") ? "localhost" : hostname;
    return `http://${targetHost}:5001`;
  }

  return import.meta.env.VITE_API_URL || "https://omission-crafting-backend.onrender.com";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export default api;

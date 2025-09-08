// src/api/auth.ts
import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true,
});

export type Me = {
  username: string;
  linked: null | { dancerName?: string; __refid?: string; pcbid?: string };
};

export const register = (username: string, email: string, refid: string, password: string) =>
  API.post("/auth/register", { username, email, refid, password }).then(r => r.data as Me);

export const login = (username: string, password: string) =>
  API.post("/auth/login", { username, password }).then(r => r.data as Me);

export const logout = () => API.post("/auth/logout").then(r => r.data);
export const getMe = () => API.get("/me").then(r => r.data as Me);

export const getMyProfile = () => API.get("/me/profile").then(r => r.data);
export const updateMyProfile = (patch: Record<string, any>) =>
  API.put("/me/profile", patch).then(r => r.data);

// ✅ necesarios por Forgot/Reset
export const forgotPassword = (email: string) =>
  API.post("/auth/forgot", { email }).then(r => r.data);

export const resetPassword = (token: string, new_password: string) =>
  API.post("/auth/reset", { token, new_password }).then(r => r.data);

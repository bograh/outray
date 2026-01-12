import { create } from "zustand";

interface AdminStore {
  token: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
}));

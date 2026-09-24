import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  email: string | null;
  role: string | null;
  setUser: (email: string, role: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      role: null,
      setUser: (email, role) => set({ email, role }),
      clear: () => set({ email: null, role: null }),
    }),
    { name: "auth" }
  )
);

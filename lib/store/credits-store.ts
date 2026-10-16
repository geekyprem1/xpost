import { create } from "zustand";

type CreditsState = {
  credits: number | null;
  resetAt: string | null;
  setCredits: (credits: number, resetAt?: string | null) => void;
  clearCredits: () => void;
};

export const useCreditsStore = create<CreditsState>((set) => ({
  credits: null,
  resetAt: null,
  setCredits: (credits, resetAt = null) => set({ credits, resetAt }),
  clearCredits: () => set({ credits: null, resetAt: null }),
}));

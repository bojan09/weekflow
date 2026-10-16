"use client";

import { create } from "zustand";
import { ACCOUNTS_ENABLED } from "@/lib/appwrite/config";
import { currentUser, type AuthUser } from "./api";

type Status = "loading" | "signedOut" | "signedIn" | "error";

interface AuthState {
  status: Status;
  user: AuthUser | null;
  /** Read the session from the account service. */
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

/** Who is signed in. Not persisted: the session itself lives with the account service. */
export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  refresh: async () => {
    if (!ACCOUNTS_ENABLED) {
      set({ status: "signedOut", user: null });
      return;
    }
    try {
      const user = await currentUser();
      set({ status: user ? "signedIn" : "signedOut", user });
    } catch {
      set({ status: "error", user: null });
    }
  },
  setUser: (user) => set({ status: user ? "signedIn" : "signedOut", user }),
}));

import { create } from 'zustand';
import type { Session, PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

const INIT_TIMEOUT_MS = 3000;
const PROFILE_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    const { session } = get();
    if (!session) {
      set({ profile: null });
      return;
    }
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      const timeoutP = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), PROFILE_TIMEOUT_MS),
      );

      const { data, error } = await Promise.race([profilePromise, timeoutP]);
      if (error || !data) {
        set({ profile: null });
        return;
      }
      set({ profile: data as Profile | null });
    } catch {
      set({ profile: null });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
    localStorage.removeItem('sangam_recent_searches');
  },

  init: async () => {
    try {
      const result = await withTimeout(
        supabase.auth.getSession(),
        INIT_TIMEOUT_MS,
        { data: { session: null }, error: null } as const,
      );
      const session = result.data?.session ?? null;
      set({ session, loading: false, initialized: true });

      if (session) {
        get().fetchProfile();
      }
    } catch {
      set({ session: null, loading: false, initialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      (async () => {
        if (session) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      })();
    });
  },
}));

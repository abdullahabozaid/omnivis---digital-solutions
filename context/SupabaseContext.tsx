import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserSettings, DashboardGoals } from '../lib/supabase/types';

interface SupabaseContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;

  // User settings
  settings: UserSettings | null;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;

  // Dashboard goals
  goals: DashboardGoals | null;
  updateGoals: (data: Partial<DashboardGoals>) => Promise<void>;

  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: string | null }>;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goals, setGoals] = useState<DashboardGoals | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Initialize auth state
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  // Load user settings when user changes
  useEffect(() => {
    if (!user || !isConfigured) {
      setSettings(null);
      setGoals(null);
      return;
    }

    const loadUserData = async () => {
      // Load settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();

      if (settingsData) {
        setSettings(settingsData as UserSettings);
      } else {
        // Create default settings for new user
        const defaultSettings = {
          id: user.id,
          profile_name: user.user_metadata?.full_name || null,
          profile_email: user.email || null,
          theme: 'system',
          notifications_email_alerts: true,
          notifications_in_app: true,
          notifications_task_reminders: true,
          notifications_client_updates: true,
        };

        const { data: newSettings } = await supabase
          .from('user_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (newSettings) {
          setSettings(newSettings as UserSettings);
        }
      }

      // Load goals
      const { data: goalsData } = await supabase
        .from('dashboard_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (goalsData) {
        setGoals(goalsData as DashboardGoals);
      } else {
        // Create default goals
        const defaultGoals = {
          user_id: user.id,
          monthly_revenue: 10000,
          yearly_revenue: 120000,
          total_clients: 50,
          pipeline_value: 50000,
        };

        const { data: newGoals } = await supabase
          .from('dashboard_goals')
          .insert(defaultGoals)
          .select()
          .single();

        if (newGoals) {
          setGoals(newGoals as DashboardGoals);
        }
      }
    };

    loadUserData();
  }, [user, isConfigured]);

  // Update settings
  const updateSettings = useCallback(
    async (data: Partial<UserSettings>) => {
      if (!user || !settings) return;

      const { data: updatedSettings, error } = await supabase
        .from('user_settings')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();

      if (!error && updatedSettings) {
        setSettings(updatedSettings as UserSettings);
      }
    },
    [user, settings]
  );

  // Update goals
  const updateGoals = useCallback(
    async (data: Partial<DashboardGoals>) => {
      if (!user || !goals) return;

      const { data: updatedGoals, error } = await supabase
        .from('dashboard_goals')
        .update(data)
        .eq('user_id', user.id)
        .select()
        .single();

      if (!error && updatedGoals) {
        setGoals(updatedGoals as DashboardGoals);
      }
    },
    [user, goals]
  );

  // Sign in with email
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    []
  );

  // Sign up with email
  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    []
  );

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSettings(null);
    setGoals(null);
  }, []);

  // Sign in with OAuth
  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github'): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const value: SupabaseContextType = {
    user,
    session,
    isLoading,
    isConfigured,
    settings,
    updateSettings,
    goals,
    updateGoals,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}

// Hook for just auth state
export function useAuth() {
  const { user, session, isLoading, signIn, signUp, signOut, signInWithOAuth } =
    useSupabase();
  return { user, session, isLoading, signIn, signUp, signOut, signInWithOAuth };
}

// Hook for user settings
export function useUserSettings() {
  const { settings, updateSettings, isLoading } = useSupabase();
  return { settings, updateSettings, isLoading };
}

// Hook for dashboard goals
export function useDashboardGoals() {
  const { goals, updateGoals, isLoading } = useSupabase();
  return { goals, updateGoals, isLoading };
}

export default SupabaseContext;

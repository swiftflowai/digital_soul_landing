import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Persona, PersonaInvite, PersonaMembership, PersonaRole } from '../types/persona';
import { deletePersonaAndMemberships } from '../services/supabaseHelpers';
import { supabase } from '../utils/supabaseClient';

interface AuthRoleState {
  currentUserEmail: string | null;
  isSupabaseAuth: boolean;
  personas: Persona[];
  memberships: PersonaMembership[];
  getRoleForPersona: (personaId: string) => PersonaRole | null;
  refresh: () => void;
  addPersona: (persona: Persona) => void;
  setMembership: (personaId: string, userEmail: string, role: PersonaRole) => void;
  removePersona: (personaId: string) => void;
  invites: PersonaInvite[];
  addInvite: (invite: PersonaInvite) => void;
}

const AuthRoleContext = createContext<AuthRoleState | undefined>(undefined);

export function AuthRoleProvider({ children }: { children: React.ReactNode }) {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState<boolean>(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [memberships, setMemberships] = useState<PersonaMembership[]>([]);
  const [invites, setInvites] = useState<PersonaInvite[]>([]);

  useEffect(() => {
    // Initialize from Supabase auth only (demo removed)
    (async () => {
      const { data } = await supabase.auth.getUser();
      const supaEmail = data.user?.email ?? null;
      if (supaEmail) {
        setCurrentUserEmail(supaEmail);
        setIsSupabaseAuth(true);
        setPersonas([]);
        setMemberships([]);
        setInvites([]);
      } else {
        setCurrentUserEmail(null);
        setIsSupabaseAuth(false);
        setPersonas([]);
        setMemberships([]);
        setInvites([]);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setCurrentUserEmail(email);
      if (email) {
        setIsSupabaseAuth(true);
        setPersonas([]);
        setMemberships([]);
        setInvites([]);
      } else {
        setIsSupabaseAuth(false);
        setPersonas([]);
        setMemberships([]);
        setInvites([]);
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const refresh = () => {
    // No-op in live-only mode (state is fetched per-page)
  };

  const addPersona = (persona: Persona) => {
    // No-op in live-only mode
  };

  const setMembership = (personaId: string, userEmail: string, role: PersonaRole) => {
    // No-op in live-only mode
  };

  const removePersona = (personaId: string) => {
    if (isSupabaseAuth) {
      // Fire and forget; UI already filtered by owner role
      deletePersonaAndMemberships(personaId).catch(() => {});
    }
    setPersonas(prev => prev.filter(p => p.id !== personaId));
    setMemberships(prev => prev.filter(m => m.personaId !== personaId));
    setInvites(prev => prev.filter(i => i.personaId !== personaId));
  };

  const addInvite = (invite: PersonaInvite) => {
    // No-op in live-only mode (pages call Supabase directly)
  };

  const getRoleForPersona = useMemo(() => {
    return (personaId: string): PersonaRole | null => {
      if (!currentUserEmail) return null;
      const m = memberships.find(
        x => x.personaId === personaId && x.userEmail === currentUserEmail
      );
      return m?.role ?? null;
    };
  }, [currentUserEmail, memberships]);

  const value: AuthRoleState = {
    currentUserEmail,
    isSupabaseAuth,
    personas,
    memberships,
    getRoleForPersona,
    refresh,
    addPersona,
    setMembership,
    removePersona,
    invites,
    addInvite,
  };

  return (
    <AuthRoleContext.Provider value={value}>{children}</AuthRoleContext.Provider>
  );
}

export function useAuthRole(): AuthRoleState {
  const ctx = useContext(AuthRoleContext);
  if (!ctx) throw new Error('useAuthRole must be used within AuthRoleProvider');
  return ctx;
}



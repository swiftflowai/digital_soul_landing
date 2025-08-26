import { Persona, PersonaInvite, PersonaMembership, PersonaRole } from '../types/persona';

const PERSONAS_KEY = 'ds_personas';
const MEMBERSHIPS_KEY = 'ds_persona_memberships';
const INVITES_KEY = 'ds_persona_invites';

export function readPersonas(): Persona[] {
  try {
    const raw = localStorage.getItem(PERSONAS_KEY);
    return raw ? (JSON.parse(raw) as Persona[]) : [];
  } catch {
    return [];
  }
}

export function writePersonas(personas: Persona[]): void {
  localStorage.setItem(PERSONAS_KEY, JSON.stringify(personas));
}

export function upsertPersona(persona: Persona): void {
  const list = readPersonas();
  const index = list.findIndex(p => p.id === persona.id);
  if (index >= 0) {
    list[index] = persona;
  } else {
    list.push(persona);
  }
  writePersonas(list);
}

export function readMemberships(): PersonaMembership[] {
  try {
    const raw = localStorage.getItem(MEMBERSHIPS_KEY);
    return raw ? (JSON.parse(raw) as PersonaMembership[]) : [];
  } catch {
    return [];
  }
}

export function writeMemberships(memberships: PersonaMembership[]): void {
  localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
}

export function assignMembership(
  personaId: string,
  userEmail: string,
  role: PersonaRole
): void {
  const list = readMemberships();
  const index = list.findIndex(
    m => m.personaId === personaId && m.userEmail === userEmail
  );
  if (index >= 0) {
    list[index].role = role;
  } else {
    list.push({ personaId, userEmail, role });
  }
  writeMemberships(list);
}

export function deletePersona(personaId: string): void {
  const personas = readPersonas().filter(p => p.id !== personaId);
  writePersonas(personas);
  const memberships = readMemberships().filter(m => m.personaId !== personaId);
  writeMemberships(memberships);
  const invites = readInvites().filter(inv => inv.personaId !== personaId);
  writeInvites(invites);
}

export function readInvites(): PersonaInvite[] {
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    return raw ? (JSON.parse(raw) as PersonaInvite[]) : [];
  } catch {
    return [];
  }
}

export function writeInvites(invites: PersonaInvite[]): void {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
}

export function createInvite(invite: PersonaInvite): void {
  const list = readInvites();
  list.push(invite);
  writeInvites(list);
}

export function updateInvite(invite: PersonaInvite): void {
  const list = readInvites();
  const idx = list.findIndex(i => i.id === invite.id);
  if (idx >= 0) {
    list[idx] = invite;
    writeInvites(list);
  }
}

export function revokeInvite(inviteId: string): void {
  const list = readInvites();
  const idx = list.findIndex(i => i.id === inviteId);
  if (idx >= 0) {
    list[idx].status = 'REVOKED';
    writeInvites(list);
  }
}



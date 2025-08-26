import { supabase } from '../utils/supabaseClient'
import type { Tables, TablesInsert } from '../types/supabase'

export async function getMyProfile() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data as Tables<'profiles'>
}

export async function createPersona(input: TablesInsert<'personas'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('personas')
    .insert(input)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Tables<'personas'>
}

export async function listMyPersonas() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('personas')
    .select('*')
  if (error) throw new Error(error.message)
  return data as Tables<'personas'>[]
}

export async function getPersonaById(personaId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .single()
  if (error) throw new Error(error.message)
  return data as Tables<'personas'>
}

export async function updatePersonaPrivacy(params: { personaId: string; privacy: 'PRIVATE' | 'LINK' | 'PUBLIC' }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('personas')
    .update({ privacy: params.privacy })
    .eq('id', params.personaId)
  if (error) throw new Error(error.message)
}

export async function listInvitesForPersonaIds(personaIds: string[]) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!personaIds || personaIds.length === 0) return [] as Tables<'persona_invites'>[]
  const { data, error } = await supabase
    .from('persona_invites')
    .select('*')
    .in('persona_id', personaIds)
  if (error) throw new Error(error.message)
  return data as Tables<'persona_invites'>[]
}

export async function listParticipantsForPersonaIds(personaIds: string[]) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!personaIds || personaIds.length === 0) return [] as any[]
  const { data, error } = await (supabase as any)
    .from('persona_participants')
    .select('*')
    .in('persona_id', personaIds)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as any[]
}

export async function removeParticipantAndMembership(params: { personaId: string; userId: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  // Remove participant record (visible in Family Members)
  const { error: partErr } = await (supabase as any)
    .from('persona_participants')
    .delete()
    .eq('persona_id', params.personaId)
    .eq('user_id', params.userId)
  if (partErr) throw new Error(partErr.message)
  // Remove membership to revoke access
  const { error: memErr } = await supabase
    .from('persona_memberships')
    .delete()
    .eq('persona_id', params.personaId)
    .eq('user_id', params.userId)
  if (memErr) throw new Error(memErr.message)
}

export async function acceptInviteAndCreateMembership(params: { token: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // Lookup invite by token
  const { data: invites, error: findErr } = await supabase
    .from('persona_invites')
    .select('*')
    .eq('token', params.token)
    .limit(1)
  if (findErr) throw new Error(findErr.message)
  const inv = invites?.[0]
  if (!inv) throw new Error('Invalid invite token')
  if (inv.status !== 'PENDING') throw new Error('Invite already used or invalid')
  // Mark invite accepted
  await supabase
    .from('persona_invites')
    .update({ status: 'ACCEPTED', accepted_user_id: user.id, accepted_at: new Date().toISOString() as any })
    .eq('token', params.token)
  // Create membership
  const { error: memErr } = await supabase
    .from('persona_memberships')
    .insert({ persona_id: inv.persona_id, user_id: user.id, role: inv.role })
  if (memErr) throw new Error(memErr.message)
  // Upsert participant profile
  await (supabase as any)
    .from('persona_participants')
    .upsert({
      persona_id: inv.persona_id,
      user_id: user.id,
      email: user.email as any,
      name: (inv as any).name || null,
      relationship: (inv as any).relationship || null,
      role: inv.role
    } as any)
}

export async function logPersonaContribution(params: { personaId: string; summary?: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  // If not signed in (anonymous invite flow), skip logging to activities to avoid RLS issues
  if (!user) return
  const { error } = await (supabase as any)
    .from('persona_activities')
    .insert({
      persona_id: params.personaId,
      actor_user_id: user.id,
      actor_email: user.email,
      activity_type: 'CONTRIBUTION',
      summary: params.summary || 'New contribution submitted'
    })
  if (error) throw new Error(error.message)
}

export async function listActivitiesForOwnerPersonaIds(personaIds: string[]) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!personaIds || personaIds.length === 0) return [] as any[]
  const { data, error } = await (supabase as any)
    .from('persona_activities')
    .select('*')
    .in('persona_id', personaIds)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as any[]
}

export async function submitPersonaContribution(params: { personaId: string; content: any; inviteToken?: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  const payload: any = {
    persona_id: params.personaId,
    submitted_by: user?.id ?? null,
    submitted_email: user?.email ?? null,
    status: 'PENDING',
    content: params.content,
    invite_token: params.inviteToken ?? null
  }
  const { error } = await (supabase as any)
    .from('persona_contributions')
    .insert(payload)
  if (error) throw new Error(error.message)
}

export async function listPendingContributionsForOwner(personaIds: string[]) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!personaIds || personaIds.length === 0) return [] as any[]
  const { data, error } = await (supabase as any)
    .from('persona_contributions')
    .select('*')
    .in('persona_id', personaIds)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as any[]
}

export async function approveOrRejectContribution(params: { id: string; status: 'APPROVED'|'REJECTED' }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await (supabase as any)
    .from('persona_contributions')
    .update({ status: params.status })
    .eq('id', params.id)
  if (error) throw new Error(error.message)
}

export async function deleteContribution(params: { id: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await (supabase as any)
    .from('persona_contributions')
    .delete()
    .eq('id', params.id)
  if (error) throw new Error(error.message)
}

// Persona stories/memories helpers (persisted in persona_contributions as APPROVED)
export interface PersonaMemoryItem { id: string; text: string; status: 'PENDING'|'APPROVED'|'REJECTED'; created_at: string }

export async function addPersonaMemories(params: { personaId: string; stories: string[]; source?: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const rows = (params.stories || [])
    .map(s => (s || '').trim())
    .filter(Boolean)
    .map(s => ({
      persona_id: params.personaId,
      status: 'APPROVED',
      content: { story: s, source: params.source || 'SETUP' }
    }))
  if (rows.length === 0) return
  const { error } = await (supabase as any)
    .from('persona_contributions')
    .insert(rows)
  if (error) throw new Error(error.message)
}

export async function listPersonaMemories(personaId: string, limit?: number): Promise<PersonaMemoryItem[]> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await (supabase as any)
    .from('persona_contributions')
    .select('id, content, status, created_at')
    .eq('persona_id', personaId)
    .order('created_at', { ascending: false })
    .limit(limit || 100)
  if (error) throw new Error(error.message)
  return (data || []).map((r: any) => ({ id: r.id, text: (r.content?.story || r.content?.text || r.content?.summary || '').toString(), status: r.status, created_at: r.created_at }))
}

export async function updatePersonaMemory(params: { id: string; text: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await (supabase as any)
    .from('persona_contributions')
    .update({ content: { story: params.text, source: 'SETTINGS' } })
    .eq('id', params.id)
  if (error) throw new Error(error.message)
}

export async function deletePersonaMemory(params: { id: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await (supabase as any)
    .from('persona_contributions')
    .delete()
    .eq('id', params.id)
  if (error) throw new Error(error.message)
}

export async function getCurrentUserId() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  return data.user?.id ?? null
}

export async function listMyMemberships() {
  const userId = await getCurrentUserId()
  if (!userId) return [] as Tables<'persona_memberships'>[]
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('persona_memberships')
    .select('*')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return data as Tables<'persona_memberships'>[]
}

export async function getMyRoleForPersona(personaId: string): Promise<'OWNER'|'CONTRIBUTOR'|'VIEWER'|null> {
  if (!supabase) throw new Error('Supabase not configured')
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('persona_memberships')
    .select('role')
    .eq('persona_id', personaId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.role as any) ?? null
}

export async function createInvite(input: TablesInsert<'persona_invites'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('persona_invites')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data as Tables<'persona_invites'>
}

export async function uploadPersonaMedia(params: { personaId: string; file: File; path?: string }) {
  if (!supabase) throw new Error('Supabase not configured')
  const path = params.path ?? `${params.personaId}/${crypto.randomUUID()}-${params.file.name}`
  const { error } = await supabase.storage.from('persona-media').upload(path, params.file, { upsert: false })
  if (error) throw error
  // Bucket is private; return a short-lived signed URL for immediate preview
  const { data: signed } = await supabase.storage.from('persona-media').createSignedUrl(path, 60 * 60)
  return { path, signedUrl: signed?.signedUrl }
}

export async function deletePersonaAndMemberships(personaId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  // Best-effort clean up dependent rows before deleting persona
  // RLS must allow owner to delete these rows
  await supabase.from('persona_invites').delete().eq('persona_id', personaId)
  await supabase.from('persona_memberships').delete().eq('persona_id', personaId)
  const { error } = await supabase.from('personas').delete().eq('id', personaId)
  if (error) throw new Error(error.message)
}



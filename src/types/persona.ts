export type PersonaPrivacy = 'PRIVATE' | 'FAMILY' | 'FRIENDS' | 'PUBLIC';

export type CreatorType = 'SELF' | 'OTHER';

export type PersonaRole = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

export interface Persona {
  id: string;
  subjectFullName: string;
  createdByUserEmail: string;
  creatorType: CreatorType;
  deceased?: boolean;
  privacy: PersonaPrivacy;
  createdAt: string; // ISO string
  consentType?: ConsentType;
}

export interface PersonaMembership {
  personaId: string;
  userEmail: string;
  role: PersonaRole;
}

export type ConsentType = 'SELF_ATTESTED' | 'SUBJECT_ACCEPTED' | 'LEGAL_AUTH';

export interface ConsentRecord {
  personaId: string;
  type: ConsentType;
  recordedAt: string; // ISO string
  docUrl?: string;
}

export interface PersonaInvite {
  id: string;
  personaId: string;
  email: string;
  name: string;
  relationship: string;
  role: PersonaRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invitedAt: string; // ISO string
  acceptedUserEmail?: string;
  contributionCount?: number;
}



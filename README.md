# Digital Soul Landing

A React + Vite app for creating and chatting with “Digital Soul” personas, including voice cloning and a live video avatar. Backend runs as Netlify Functions acting as a BFF (Backend-for-Frontend) over Supabase and media providers (Simli, Heygen, TTS).

Repo: https://github.com/swiftflowai/digital_soul_landing

## System diagram

```mermaid
flowchart LR
  classDef box fill:#fff,stroke:#bbb,rx:6,ry:6,color:#1f2937;
  classDef ext fill:#f8fafc,stroke:#cbd5e1,rx:6,ry:6,color:#334155;
  classDef svc fill:#fdf2f8,stroke:#db2777,rx:6,ry:6,color:#831843;
  classDef db fill:#ecfeff,stroke:#06b6d4,rx:6,ry:6,color:#0e7490;
  classDef fn fill:#eef2ff,stroke:#6366f1,rx:6,ry:6,color:#3730a3;

  subgraph C[Web App (Vite + React, TypeScript, Tailwind)]
    C1[UI: Chat, Settings, Persona Setup<br/>SimliFaceCreator, PersonaAvatar]:::box
    C2[State/Hooks: AuthRoleContext,<br/>useStreamedChat, useAudioRecorder]:::box
    C3[Supabase client: auth session,<br/>signed URLs]:::box
  end

  subgraph F[Backend-for-Frontend (Netlify Functions)]
    F1[Auth & Helpers<br/>_lib/auth, _lib/supabase]:::fn
    F2[Chat & TTS<br/>chat.ts, voice-chat.ts, tts.ts, tts-preview.ts]:::fn
    F3[Voice Clone<br/>voice-clone-create.ts, voice-clone-status.ts]:::fn
    F4[Video Avatar (Simli)<br/>generate-faceid.ts, faceid-status.ts,<br/>simli-face-status.ts, simli-start/stop-session.ts,<br/>simli-face-create.ts, simli-face-watch-background.ts]:::fn
    F5[Heygen Lipsync<br/>avatar-upload.ts, avatar-generate-lipsync.ts, avatar-status.ts]:::fn
  end

  subgraph S[Supabase]
    S1[(Auth)]:::db
    S2[(Postgres)<br/>personas, memberships,<br/>contributions (memories), activities]:::db
    S3[(Storage: persona-media)<br/>avatar images, signed URLs]:::db
  end

  subgraph X[External Media Services]
    X1[Simli API<br/>generateFaceID, status,<br/>live session via simli-client]:::ext
    X2[Heygen API<br/>lipsync jobs + status]:::ext
    X3[TTS Provider(s)]:::ext
  end

  C -->|REST/Fetch| F
  F -->|Verify session / service role| S1
  F <--> |R/W| S2
  F <--> |Upload/list/signed URLs| S3

  F4 --> |generateFaceID / status| X1
  F4 --> |dev session bootstrap| X1
  F5 --> |jobs + polling| X2
  F2 --> |synthesize audio| X3

  C <--> |streamed responses, audio, video| F
  C <--> |signed URL previews| S3
```

## Architecture

- Frontend (Vite + React + Tailwind)
  - Pages in `src/pages` (Chat, Settings, Persona Setup, Dashboard, etc.)
  - Components in `src/components` (`SimliFaceCreator`, `SimliAvatarPanel`, `PersonaAvatar`, marketing UI)
  - Routing: `react-router-dom` via `src/App.tsx`
  - State: `AuthRoleContext`; hooks: `useStreamedChat`, `useAudioRecorder`
  - Supabase browser client for session + signed URLs

- BFF (Netlify Functions, `netlify/functions`)
  - Auth/util: `_lib/auth.ts`, `_lib/supabase.ts`
  - Chat/TTS: `chat.ts`, `voice-chat.ts`, `tts.ts`, `tts-preview.ts`
  - Voice clone: `voice-clone-create.ts`, `voice-clone-status.ts`
  - Video avatar (Simli): `generate-faceid.ts`, `faceid-status.ts`, `simli-face-status.ts`, `simli-start-session.ts`, `simli-stop-session.ts`, `simli-face-create.ts`, `simli-face-watch-background.ts`
  - Heygen lipsync: `avatar-upload.ts`, `avatar-generate-lipsync.ts`, `avatar-status.ts`

- Data (Supabase)
  - Auth, Postgres (personas, memberships, contributions/memories, activities)
  - Storage bucket `persona-media` for avatar images; signed URL previews
  - Helpers in `src/services/supabaseHelpers.ts`

## Key flows

- Create video avatar (Simli)
  - Web uploads a headshot → `generate-faceid.ts` → Simli `generateFaceID`
  - BFF stores original image in `persona-media` and merges metadata (`simli_face_id`, `simli_face_image_path`)
  - Poll via `faceid-status.ts` / `simli-face-status.ts`; UI shows `face_id` and circular preview via signed URL

- Start live avatar session
  - Web → `simli-start-session.ts` (dev helper) → API key + persona-aware `face_id`
  - `SimliAvatarPanel` initializes `simli-client` for live video/audio and lip‑sync

- Voice cloning
  - Upload/record → `voice-clone-create.ts` → poll `voice-clone-status.ts` → store `voice_id`

- Voice-enabled chat
  - `useStreamedChat` streams assistant text; `tts.ts`/`tts-preview.ts` synthesize speech
  - If Simli active, audio is routed to avatar for lip‑sync; otherwise normal playback

## Configuration

- Client env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server env (functions): `SIMLI_API_KEY`, optional `SIMLI_FACE_ID`, `SIMLI_EXPOSE_KEY=true` (dev only), provider keys for Heygen/TTS

## Local development

- Vite dev server (SPA) + Netlify functions
- For Simli local testing, set `SIMLI_EXPOSE_KEY=true` and use `simli-start-session.ts`
- Supabase Storage previews use short‑lived signed URLs; cache‑busting handled in UI
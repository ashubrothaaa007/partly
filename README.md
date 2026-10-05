# Partly

Partly is an in-browser 3D multiplayer social venue and virtual festival ground built with React, Three.js, and Supabase. Players drop into shared persistent rooms as customizable low-poly avatars, navigate an interactive island environment, communicate via spatial chat, and listen to synchronized stage performances.

- **Live URL**: [https://trypartly.vercel.app](https://trypartly.vercel.app)
- **Repository**: [https://github.com/ashubrothaaa007/partly](https://github.com/ashubrothaaa007/partly)

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React UI & HUD Layer    │
                          │ (Chat, Track Picker, HUD) │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                                                         ▼
┌─────────────────────────┐                               ┌─────────────────────────┐
│     Three.js Engine     │                               │   Multiplayer Engine    │
│  - WebGLRenderer        │                               │  - Supabase Realtime    │
│  - EffectComposer Bloom │                               │    • Presence (Avatars) │
│  - CSS3D YouTube Iframe │                               │    • Broadcast (Sync)   │
│  - Raycasting & Physics │                               │  - KV Store Polling     │
└─────────────────────────┘                               └─────────────────────────┘
```

The application combines a high-framerate WebGL scene with an event-driven realtime network layer. Key engineering decisions include:

### 1. Hybrid WebGL & CSS3D Rendering Pipeline
Embedding third-party streaming video (YouTube) into a Three.js canvas without prohibitive canvas-copy overhead or CORS blocks is handled via a layered rendering approach:
- A transparent `CSS3DRenderer` places an interactive YouTube iframe in 3D world space behind the stage screen.
- A WebGL mesh aligned precisely to the stage geometry uses blending and custom depth testing to punch through the canvas while rendering stage borders, lighting rigs, dynamic neon signs, and bloom effects over it.
- YouTube Iframe Player API events (`playVideo`, `unMute`, `setVolume`) are coordinated over `postMessage` channels to respect modern browser autoplay policies while maintaining state sync across track changes.

### 2. Realtime State Synchronization & Convergence
Partly uses a dual-layer synchronization model:
- **Fast Path (Supabase Realtime Broadcast & Presence)**: Ephemeral events (player positions, rotation, animation states, and chat messages) are broadcast directly between connected peers with sub-50ms latency.
- **Durable Path (Postgres KV Store + 2s Polling Fallback)**: Active stage metadata (current video ID, track title, and timestamp) is committed to Supabase KV store (`kv_store_488bc5db`). If a client experiences a network hiccup or resumes from a background tab where WebSockets were throttled, the periodic polling loop reconciles local stage state with the room's source of truth.

### 3. Kinematics & Collision
- Player motion uses a lightweight tick-based character controller with velocity integration, gravity acceleration, and ground raycasts.
- Third-person orbit camera follows the player avatar with spherical coordinate dampening and clamp limits to prevent terrain clipping.

### 4. Audio Pipeline
- Spatial sound synthesis powered by the Web Audio API generates ambient environmental sounds, ocean wave noise, and footsteps without external audio asset downloads.
- Stage music volume is normalized and routed through an interactive audio master toggle.

---

## Repository Structure

```
partly/
├── public/                     # Static textures, billboard graphics, favicons
├── src/
│   ├── app/
│   │   ├── components/         # React presentation and HUD components
│   │   │   ├── ChatPanel.tsx   # Real-time room chat drawer
│   │   │   ├── HUD.tsx         # Player status, controls overlay, emote triggers
│   │   │   ├── LandingPage.tsx # Entrance lobby, handle selection, room picker
│   │   │   ├── PartyScene.tsx  # Scene orchestrator & stage track manager
│   │   │   └── ThreeCanvas.tsx # Three.js render loop, camera, and player controller
│   │   ├── hooks/
│   │   │   └── useMultiplayer.ts # Supabase Realtime presence, broadcast, and fallback
│   │   └── App.tsx             # Root application coordinator
│   ├── scene/                  # Procedural 3D scene construction
│   │   ├── avatars.ts          # Procedural low-poly avatar mesh generators
│   │   ├── materials.ts        # Shared Three.js materials and shaders
│   │   ├── props.ts            # Environment props (tiki stalls, chairs, palm trees)
│   │   ├── stage.ts            # Festival stage, lighting trusses, screen canvas
│   │   ├── types.ts            # Core scene and animation data types
│   │   ├── wildlife.ts         # Ambient creatures and particle systems
│   │   └── world.ts            # Master scene builder and lighting configuration
│   ├── styles/                 # Global styles and Tailwind v4 CSS
│   ├── utils/
│   │   └── supabaseClient.ts   # Configured Supabase client singleton
│   └── main.tsx                # Client entry point
├── supabase/                   # Database schema migrations and edge function definitions
├── vercel.json                 # HTTP security headers and SPA rewrites
└── vite.config.ts              # Vite bundle configuration
```

---

## Local Development

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### 1. Clone & Install
```bash
git clone https://github.com/ashubrothaaa007/partly.git
cd partly
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root (see `.env.example`):
```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note**: Only the public `anon` key is required on the client. Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend environment variables.

### 3. Run Development Server
```bash
npm run dev
```
The application will spin up at `http://localhost:5173`.

### 4. Production Build
```bash
npm run build
```
Generates an optimized production bundle in the `dist/` directory.

---

## Controls

| Key / Input | Action |
|---|---|
| `W`, `A`, `S`, `D` / Arrows | Move avatar |
| `Space` | Jump |
| Left Click + Drag | Orbit third-person camera |
| Mouse Wheel | Camera zoom |
| `C` | Dance emote |
| `V` | Wave emote |
| `B` | Cheer emote |
| `N` | Sit down |
| `Enter` | Open chat box |

---

## Security & Hardening

1. **Client Isolation**: No administrative credentials or database connection strings are exposed in client bundles. Supabase queries use the public `anon` role constrained by Row Level Security (RLS) policies.
2. **Input Validation**: Track URLs and video IDs submitted to the stage controller are sanitized against strict regular expressions (`/^[a-zA-Z0-9_-]{11}$/`) before iframe injection.
3. **HTTP Security Headers**: Production deployments via `vercel.json` enforce:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), geolocation=()`

---

## License

MIT
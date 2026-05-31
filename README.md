# ProjectIQ Infrastructure Designer

ProjectIQ Infrastructure Designer is a high-performance spatial planner for enterprise infrastructure deployments. This tool allows engineers and coordinators to map networks, place CCTV cameras, calculate power requirements, configure switch port allocations, and generate bills of materials (BOM).

## Tech Stack

* **Framework:** Next.js App Router, Server Actions, TypeScript
* **Styling:** Tailwind CSS v4
* **Database & Auth:** Supabase Postgres, RLS, Auth SSR
* **Deployment:** Vercel

## Deployment & Reference IDs

- **Vercel Production URL:** [https://projectiq-infrastructure-designer.vercel.app](https://projectiq-infrastructure-designer.vercel.app)
- **Supabase Project ID:** `fkokqccxhljbuqyutkxi`
- **GitHub Repository:** [https://github.com/marcelopobleteus-cyber/projectiq-infrastructure-designer](https://github.com/marcelopobleteus-cyber/projectiq-infrastructure-designer)

## Sprint 1 Scope

- **Database Architecture:** Created complete schema containing enums, profiles, organizations, memberships, camera models, network devices, switch ports, and tasks.
- **Auth Provisioning:** Automatically provisions user profiles, initial organization workspaces, and assigns the creator as the workspace `owner` upon signup.
- **Client/Server Utilities:** Safe browser and server Supabase integrations using `@supabase/ssr` cookies.
- **Project Catalog & Creation:** Page lists projects and features an automated project creator which resolves the user's organization from database memberships (Correction 4).
- **Project Detail Page:** Detail route showing basic info and coordinate properties.

## Database Tables & Modules

- `profiles`: User information (e.g. name, avatar).
- `organizations`: Enterprise organization workspaces.
- `organization_members`: User assignments to organizations with roles (`owner`, `admin`, `member`).
- `projects`: Infrastructure projects under an organization.
- `camera_models`: Reusable catalog of cameras (pre-seeded).
- `network_devices`: Switches, Routers, NVRs, and Patch Panels.
- `camera_locations`: CCTV placement coordinates.
- `switch_ports`: Switchport configurations referencing the single source of truth camera-to-port assignment.
- `field_tasks`: Team task management (`status` using `task_status` enum).
- `bom_items`: Bill of Materials items tracking costs (`quantity` configured as `NUMERIC(12,2)`).

## Current Routes

- **Public Routes:**
  - `/` (Landing page)
  - `/login` (Sign in page)
  - `/register` (Sign up page)
  - `/auth/callback` (OAuth / Session exchange endpoint)
- **Protected Routes:**
  - `/projects` (Project listing dashboard)
  - `/projects/create` (Project configuration flow)
  - `/projects/[projectId]` (Project specification view)

## Local Development Setup

### Prerequisite Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fkokqccxhljbuqyutkxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Installation

```bash
# Install dependencies
npm install

# Run the local development server
npm run dev
```

## Planned for Sprint 2

- Google Maps JavaScript API integration.
- Camera marker placement and drag-and-drop coordinate adjustment.
- Camera coverage and angle visualizations on map.
- Network device linkage and port allocations panel.

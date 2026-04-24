# School Connect Hub

A comprehensive multi-role school management system designed to streamline communication, attendance tracking, exam management, and administrative operations across students, parents, teachers, and administrators.

## Overview

**School Connect Hub** is a modern web application that provides role-based dashboards and features for four user types:

- **Students** — Track attendance, marks, exams (offline & online), homework, timetable, library access, fee payments, leave requests, and more
- **Parents** — Monitor child's academic progress, attendance, fees, library usage, and participate in PTM meetings
- **Teachers** — Manage classes, attendance entry, marks entry with bulk uploads, homework, online exam creation, question banks with AI generation, and analytics
- **Admins** — Full system administration including user management, exam settings, seat allocations, result workflows, admissions intake, and comprehensive analytics

The platform also features a **public admissions portal** for prospective applicants and **demo dashboards** for prospects to explore each role.

## Tech Stack

| Layer | Technology |
|---|---|
| **Build Tool** | Vite 5 with React SWC |
| **Language** | TypeScript (strict) |
| **UI Framework** | React 18 + React Router 6 |
| **Component Library** | shadcn/ui (Radix primitives) |
| **Styling** | Tailwind CSS + animations |
| **Forms** | react-hook-form + Zod validation |
| **Data Fetching** | TanStack Query (React Query) |
| **Backend** | Supabase (Postgres + Auth + Edge Functions) |
| **Payments** | Razorpay checkout integration |
| **PDF Generation** | @react-pdf/renderer |
| **Charts & Analytics** | Recharts |
| **Icons** | Lucide React |
| **Notifications** | Sonner toasts |

## Key Features

- 🔐 Role-based authentication and access control
- 📚 Comprehensive academic management (attendance, marks, exams)
- 🎯 Online exam builder with proctoring console
- 💳 Integrated payment processing with Razorpay
- 📄 PDF generation (hall tickets, report cards, attendance reports)
- 🤖 AI-powered question generation for teachers
- 📊 Advanced analytics and reporting
- 💬 In-app messaging and notifications
- 🎫 Admissions management with eligibility rules
- 🏆 Gamification with student badges
- 🚗 Transport management
- 📖 Digital library management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/Yashika0724/school-systems.git

# Navigate to the project directory
cd school-systems

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase credentials
```

### Environment Variables

Create a `.env.local` file with the following:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Project Structure

```
src/
├── App.tsx                    # Main router and providers
├── pages/                     # Route pages (landing, dashboards, admissions)
├── components/                # React components organized by role
│   ├── admin/                # Admin-specific components
│   ├── teacher/              # Teacher-specific components
│   ├── student/              # Student-specific components
│   ├── parent/               # Parent-specific components
│   ├── ui/                   # shadcn/ui primitives
│   └── pdf/                  # PDF document components
├── hooks/                     # Custom hooks (domain-specific data fetching)
├── contexts/                  # React contexts (auth, demo mode)
├── lib/                       # Utility functions and helpers
└── integrations/supabase/     # Supabase client and auto-generated types

supabase/
├── migrations/                # Database migrations
└── functions/                 # Edge functions (auth, payments, AI, etc.)
```

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

## Linting

```bash
npm run lint
```

## Development Workflow

1. Create a new branch for your feature
2. Make your changes following the conventions in [AGENTS.md](./AGENTS.md)
3. Run linting and build checks
4. Push to your branch and create a pull request

## Documentation

For detailed architectural information, feature descriptions, and coding conventions, refer to [AGENTS.md](./AGENTS.md).

## License

This project is proprietary. All rights reserved.

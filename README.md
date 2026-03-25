# Staff Management System

Full-stack HR platform for employee management, shift scheduling, attendance tracking, work hours summary, training management, and an AI HR assistant.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, Axios
- **Backend**: Next.js API Routes (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT, bcrypt password hashing

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `DATABASE_URL` – PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/staff_management`)
   - `JWT_SECRET` – Secret key for JWT (change in production)

3. **Database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

4. **Run dev server**
   ```bash
   npm run dev
   ```

5. **Demo logins** (after seed)
   - Admin: `admin` / `password123`
   - Manager: `manager` / `password123`
   - Staff: `staff` / `password123`

## Features

- **Dashboard**: Overview of employees today, absent, shifts missing staff, corrections pending, training deadlines
- **Employees**: CRUD, soft delete (status = inactive)
- **Shifts**: Weekly planner, conflict detection, staff requirement indicators
- **Attendance**: Check-in/out, history, manager corrections, edit audit log
- **Work Hours**: Summary by employee, pay period, overtime, CSV export
- **Training**: Assign training, track completion, deadlines
- **Policy Docs**: Admin uploads HR documents for AI
- **AI Assistant**: RAG-ready; answers from approved HR documents only (placeholder until RAG is configured)

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── (protected)/   # Auth-required pages
│   └── login/
├── components/
├── contexts/
└── lib/
prisma/
├── schema.prisma
└── seed.ts
```
# staff-management-2

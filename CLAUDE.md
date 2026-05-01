# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Session Start Checklist

At the start of every new session:

1. Ensure `tasks/lessons.md` and `tasks/todo.md` exist. If missing, create each with a one-line title `# Lessons Learned` / `# TODO` plus a short subtitle.
2. Read `tasks/lessons.md` — known pitfalls from past corrections.
3. Read `tasks/todo.md` — pending cross-change items and deferred features.
4. Read `openspec/project.md` — project context and conventions.
5. If working on a feature: check `openspec/changes/` for active (non-archived) changes and read their `tasks.md`.

---

## Critical Rules

- **Never execute `git commit` or `git push`** unless explicitly asked. Provide the commands for the user to run manually.
- **Do not over-engineer**: implement exactly what is asked — no extra endpoints, migration scripts, debug APIs, or entity files. When in doubt, do less.
- **Output data directly**: when asked for data or JSON, print it to stdout. Do not provide placeholder values, setup instructions, or scripts unless explicitly requested.
- **Verify schema before modifying queries**: always check `prisma/schema.prisma` before assuming a field exists on a model.
- **Reuse before creating**: search `src/` for existing facades / ports / adapters / helpers before writing a new one.

---

## AI Development Workflow

Three systems work together as one pipeline:

| Layer       | Tool                                 | Purpose                                   |
| ----------- | ------------------------------------ | ----------------------------------------- |
| **Memory**  | `tasks/todo.md` + `tasks/lessons.md` | Cross-session deferred items and lessons  |
| **Spec**    | `openspec/changes/<name>/`           | Proposal, design, specs, tasks per change |
| **Process** | Superpowers skills                   | How to explore, implement, verify, review |

### Phase 1 — Explore & Design (new feature)

- Invoke `superpowers:brainstorming` — clarify requirements using Pencil `.pen` file or PNG assets in `openspec/assets/`.
- Write approved design → `openspec/changes/<name>/design.md`.

### Phase 2 — Specify

- Invoke `openspec-propose` → generates `proposal.md`, `specs/`, `tasks.md` in the change folder.
- User reviews and approves before any code is written.

### Phase 3 — Implement

- Invoke `superpowers:using-git-worktrees` to work in isolation.
- Work through `openspec/changes/<name>/tasks.md` task by task.
- Per task: `superpowers:test-driven-development` → implement → `superpowers:verification-before-completion`.
- Run Pre-Change Checklist before suggesting a commit.

### Phase 4 — Complete

- Invoke `superpowers:requesting-code-review`.
- Invoke `superpowers:finishing-a-development-branch`.
- Invoke `openspec-archive-change` to close the change.
- Move any deferred items to `tasks/todo.md`.
- Append new lessons to `tasks/lessons.md`.

### Memory rules

**`tasks/todo.md`** — update in these four situations:

1. **Before implementation**: record the change name and goal being started (e.g. `[ ] implement add-role-management`).
2. **After implementation**: review todo.md, confirm all goals are met, move completed items to the "done" section.
3. **Cross-change side effect discovered**: write it immediately, do not wait until end of session.
4. **Feature deferred due to external dependency**: record the reason and condition.

**`tasks/lessons.md`** — append after **every** correction from the user; never delete entries.

**Design docs** always live in `openspec/changes/<name>/design.md` — **never** in `docs/superpowers/specs/`.

---

## Communication Style

- Default to **Traditional Chinese (繁體中文)** unless the user switches to English.
- When the user says "不用" or interrupts, stop immediately and keep responses brief.
- Before making changes, outline the plan (which files, what changes) and wait for confirmation.
- Use headers / sections when the answer has multiple parts.
- Responses are in **Traditional Chinese** by default.

---

## Code Style

- Every non-trivial function must include a TSDoc comment in Traditional Chinese:
  ```typescript
  /**
   * 依 ID 查詢使用者
   * @param id - 使用者 ID
   * @returns 使用者記錄或 null
   */
  ```
- **Comment language**: Comments are in **Traditional Chinese (繁體中文)**.
  - Principle: add comments **only where necessary, in moderation** (the _why_, non-obvious logic, domain terms) — not too verbose, not too sparse.
- Prefer arrow functions over `function` declarations unless a named function is strictly required (hoisting, recursion).

---

## Pre-Change Checklist

After making changes, before suggesting a commit:

1. `npx tsc --noEmit` — fix all type errors
2. `npm run lint` — fix all lint warnings/errors
3. `npm run test` — ensure no regressions (run `npm run test:e2e` if controllers/routes changed)

Once all checks pass, suggest a commit message (Traditional Chinese, conventional commits format). Do not execute `git commit`.

---

## Commands

```bash
# Development
npm run dev          # watch mode
npm run start        # start app
npm run build        # production bundle

# Testing
npm run test         # unit tests (*.spec.ts)
npm run test:watch   # watch mode
npm run test:cov     # with coverage
npm run test:e2e     # e2e tests (test/*.e2e-spec.ts)
npx jest src/path/to/file.spec.ts   # single file

# Code Quality
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier

# Database
npm run db:migrate   # prisma migrate dev
npm run db:generate  # regenerate Prisma client
npm run db:studio    # open Prisma Studio
npm run db:seed      # run seed scripts
npm run db:create    # create database
npm run db:drop      # drop database

# Swagger
npm run swagger:bundle   # bundle openapi.yaml → openapi.bundle.yaml
```

Migrations are managed via Prisma. Schema lives in `prisma/schema.prisma`.

---

## Architecture

**NestJS + Express** application, **Hexagonal Architecture (Ports & Adapters)**:

Domain modules: `auth`, `user`, `bar`, `event`, `order`, `cart`, `subscription`, `benefit`, `favorite`, `notification`

```
src/
├── adapter/
│   ├── in/web/
│   │   ├── <module>/  # One subfolder per domain module (auth/, user/, bar/, event/, ...)
│   │   │              # Contains the Controller + all DTOs for that module
│   │   ├── decorator/ # Shared decorators (@CurrentUser etc.)
│   │   ├── filter/    # GlobalExceptionFilter
│   │   ├── guard/     # JwtAuthGuard, LineAuthGuard etc.
│   │   ├── helper/    # Shared helpers
│   │   └── interceptor/
│   └── out/
│       ├── persistence/
│       │   └── <module>/  # One subfolder per domain module
│       ├── firebase/      # Firebase Auth + Storage adapter
│       ├── line-auth/     # LINE OAuth adapter
│       ├── line-pay/      # LINE Pay adapter
│       ├── gemini/        # Google Gemini AI adapter
│       └── mail/          # Nodemailer adapter
├── application/
│   ├── facade/        # Public API of application layer (AuthFacade, BarFacade, etc.)
│   ├── port/
│   │   ├── in/        # Use case interfaces
│   │   └── out/       # Repository / external service interfaces
│   └── service/
│       └── <module>/  # One subfolder per domain module
├── domain/
│   ├── model/         # Domain entities (User, Bar, Event, etc.)
│   ├── value-object/  # Value objects (Email, UserId, etc.)
│   └── exception/     # Domain exceptions (plain Error subclasses)
├── infrastructure/
│   ├── prisma/        # PrismaModule, PrismaService
│   └── validate-env.ts
└── modules/           # NestJS module wiring (one .module.ts per domain module)
```

**Module subfolder rule**: when adding a new domain module, place the Controller + DTOs under `adapter/in/web/<module>/`, Prisma repositories under `adapter/out/persistence/<module>/`, and services under `application/service/<module>/`. Shared infrastructure (guards, filters, decorators) stays in its own top-level directory.

**Dependency flow**: `adapter/in` → `application` → `port/out` ← `adapter/out`.
The `application` and `domain` layers never import from `adapter`. Outbound adapters implement port interfaces injected via NestJS DI.

**Facade convention**: each domain area exposes a `*Facade` as its public API for controllers (e.g. `AuthFacade`, `MemberFacade`).

**Exception mapping**: domain exceptions are plain `Error` subclasses. HTTP status mapping happens in `src/adapter/in/web/filter/GlobalExceptionFilter.ts` — add a new `instanceof` branch when introducing a new domain exception.

### Database

- **ORM**: Prisma with PostgreSQL
- **Service**: `PrismaService` extends `PrismaClient`, wired globally via `PrismaModule`
- **Connection**: `DATABASE_URL` env var（standard PostgreSQL connection string）

### Authentication

- **JWT** (`@nestjs/jwt`) — access tokens signed with `ACCESS_SECRET`
- **Token Blacklist** — Redis-backed (`TokenBlacklistPort`); logout invalidates tokens
- **User Context Cache** — Redis (`UserContextCachePort`) caches role/permissions per JWT
- **Guards**: `JwtAuthGuard` validates JWT + blacklist; `PermissionsGuard` / `RolesGuard` enforce RBAC; `@Public()` skips JwtAuthGuard for open routes
- **Redis fail strategy** (matrix authoritative source: `src/infrastructure/redis/redis.service.ts`):
  - Token blacklist: **fail-closed** (Redis down → 503; prevents reuse of logged-out tokens)
  - UserContext cache: **graceful** (cache miss → DB lookup with warn log)
  - Throttler / generic counters: **silent degrade** (returns 0; 不節流，記 warn log)
- **Guard wiring**: `JwtAuthGuard` is not registered as `APP_GUARD` until business modules provide `LOAD_USER_CONTEXT_PORT`. Apply via `@UseGuards(JwtAuthGuard, SessionIdleGuard)` on authenticated controllers; future global registration must keep order `… → JwtAuthGuard → SessionIdleGuard`.

### Logging

- **Pino** with `pino-roll` for file rotation
- System logs persist to DB via `SaveSystemLogPort`

### Environment

Validated at startup via `src/infrastructure/validate-env.ts`. Singleton `getEnv()` in production also enforces: non-`*` CORS, non-empty DB password, `BCRYPT_ROUNDS ≥ 12`, non-placeholder secrets.

### E2E Testing

Tests in `test/` use Jest (`test/jest.e2e.config.js`) with a shared `createE2EApp` helper (`test/test-app.ts`) and env setup (`test/setup-env.ts`). `PrismaService` / `RedisService` are overridden with plain mock objects — see any existing `*.e2e-spec.ts` for the pattern.

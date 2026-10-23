# AGENTS.md — HeavyCult

Monorepo de la plataforma HeavyCult. Repositorio: `github.com/Davidshtp/HeavyCult`.

## Estructura

- `frontend/` — Next.js 15.5.25 (Turbopack) + React 19 + Tailwind CSS 4 + shadcn/ui (base-ui), tiptap, zod, react-hook-form, sonner, lucide.
- `backend/` — NestJS + TypeORM + PostgreSQL; auth JWT/passport, throttler, helmet, class-validator/joi, cloudinary, handlebars, @nestjs/schedule.

## Reglas operativas

- **NUNCA** levantes servidores de desarrollo ni procesos de larga duración (`npm run start:dev`, `nest start --watch`, `next dev`, etc.). Solo `build` / `lint` / `typecheck` / `test`. Al terminar, entrega al usuario el comando manual exacto y deja los puertos libres.
- Código fuertemente tipado (TS estricto), SOLID/DRY/Clean Code. Una responsabilidad/dominio por archivo: no mezcles lógica de pagos/usuario/etc. en un service de otro dominio.
- Responde en español; identificadores, archivos y términos técnicos en inglés.
- Antes de escribir código que use una librería/framework/API, consulta Context7 MCP y verifica la versión instalada en el proyecto.

## Scripts verificables (sin levantar servidores)

- Backend: `npm --prefix backend run typecheck` · `npm --prefix backend run lint` · `npm --prefix backend run build`
- Frontend: `npm --prefix frontend run lint` · `npm --prefix frontend run build`

## UI/UX (frontend)

Diseños modernos (layout asimétrico/fluido, micro-interacciones, Framer Motion / Tailwind). Nada de paneles tipo Bootstrap. Separa presentación de lógica de negocio. Diseña siempre estados de carga (skeletons), vacíos y de error.

Al crear o modificar una vista, verifica visualmente con Playwright MCP y corrige (solo contra el server que el usuario tenga corriendo; nunca lo levantes tú).
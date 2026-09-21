# HeavyCult ERP

Sistema ERP de HeavyCult. Fase 1: autenticación y gestión de usuarios.

## Estructura

```
HeavyCult/
├── backend/   # API REST — NestJS 11 + TypeORM + PostgreSQL
└── frontend/  # App web — Next.js 15 + Tailwind + shadcn/ui   (en construcción)
```

## Requisitos

- Node.js >= 20 (probado con v24)
- PostgreSQL 17 (servicio `postgresql-x64-17`) en `localhost:5432`

## Backend

### Configuración

1. Crear la base de datos y el usuario de aplicación:

   ```bash
   psql -U postgres -h localhost -p 5432
   CREATE USER heavycult_user WITH PASSWORD 'cambiar_clave';
   CREATE DATABASE heavycult OWNER heavycult_user;
   ```

2. Copiar `backend/.env.example` a `backend/.env` y ajustar valores (puerto, correo SMTP, secretos JWT, admin inicial).

3. Instalar y arrancar:

   ```bash
   cd backend
   npm install
   npm run start:dev   # http://localhost:5560
   ```

   Al primer arranque las migraciones crean las tablas y siembran el admin definido en `ADMIN_*` (idempotente).

### Variables de entorno

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PORT` | Puerto de la API | `5560` |
| `DB_*` | Conexión PostgreSQL | `heavycult` / `heavycult_user` |
| `JWT_SECRET` / `JWT_EXPIRES_IN_SECONDS` | Sesión | `3600` |
| `JWT_RECOVERY_SECRET` / `JWT_RECOVERY_EXPIRES_IN_SECONDS` | Enlace de recuperación | `300` |
| `FRONTEND_URL` | Origen CORS y enlace de recuperación | `http://localhost:3000` |
| `COOKIE_SECURE` / `COOKIE_MAX_AGE_SECONDS` | Cookie `jwt` | `false` / `86400` |
| `MAIL_HOST` etc. (SMTP) | Correo real (MailerSend/Resend) | — |
| `RESET_MAX_ATTEMPTS` | Intentos del código | `5` |
| `ADMIN_NOMBRE/APELLIDO/CORREO/CONTRASENA` | Admin sembrado | `admin@heavycult.co` |

Si SMTP no está configurado, en desarrollo el envío se simula y el código + enlace se muestran en la consola.

### Endpoints (`/api`)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/` | público | Health |
| POST | `/auth/login` | público | Inicia sesión (cookie `jwt` httpOnly) |
| GET | `/auth/perfil` | sesión | Datos del usuario logueado |
| POST | `/auth/logout` | sesión | Cierra sesión |
| POST | `/auth/recuperar` | público | Envía enlace + código de recuperación |
| POST | `/auth/restablecer?token=` | público | Valida código y cambia la contraseña |
| POST | `/users` | admin | Crea usuario |
| GET | `/users` | admin | Lista usuarios |
| PATCH | `/users/:id/estado` | admin | Activa/inactiva/bloquea un usuario |

### Comandos

```bash
npm run build   # compilar a dist/
npm run lint    # eslint
npm run start:dev
```

## Licencia y uso, junto con el esquema, se documentarán en fases posteriores.
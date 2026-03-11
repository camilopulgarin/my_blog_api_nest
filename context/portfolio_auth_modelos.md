# DISEÑO DE BASE DE DATOS
## Módulo de Autenticación & Usuarios
**Portafolio Dinámico Web App | NestJS + Prisma + PostgreSQL**

---

## 1. Descripción General

Este documento define el modelo Entidad-Relación para el módulo de autenticación de la aplicación de portafolios dinámicos. El diseño soporta dos métodos de registro e inicio de sesión:

- Registro tradicional mediante correo electrónico y contraseña.
- Inicio de sesión con cuenta de Google mediante OAuth 2.0.
- Gestión de sesiones persistentes con refresh tokens almacenados en base de datos.

El modelo está diseñado con escalabilidad en mente: la tabla `OAuthProvider` permite agregar proveedores adicionales (GitHub, Facebook, etc.) en el futuro sin modificar la estructura principal.

---

## 2. Entidades del Modelo

### 2.1 User — Tabla Principal de Usuarios

Almacena la información base de todos los usuarios, independientemente del método de registro utilizado. El campo `password_hash` es nullable para permitir usuarios que solo usan OAuth.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| 🔑 `id` | `UUID` | PK, NOT NULL | Identificador único del usuario |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Correo electrónico del usuario |
| `password_hash` | `TEXT` | NULLABLE | Hash de contraseña (null si solo OAuth) |
| `first_name` | `VARCHAR(100)` | NOT NULL | Nombre del usuario |
| `last_name` | `VARCHAR(100)` | NOT NULL | Apellido del usuario |
| `birth_date` | `DATE` | NULLABLE | Fecha de nacimiento |
| `is_active` | `BOOLEAN` | DEFAULT true | Estado de la cuenta |
| `is_email_verified` | `BOOLEAN` | DEFAULT false | Verificación de correo |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Fecha de creación del registro |
| `updated_at` | `TIMESTAMP` | DEFAULT NOW() | Última actualización del registro |

---

### 2.2 OAuthProvider — Proveedores de Autenticación Externa

Tabla separada para gestionar identidades externas. Un mismo usuario puede tener múltiples proveedores vinculados. El índice único en `(provider, provider_id)` garantiza que no haya duplicados.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| 🔑 `id` | `UUID` | PK, NOT NULL | Identificador único del proveedor OAuth |
| 🔗 `user_id` | `UUID` | FK → User.id, NOT NULL | Relación con el usuario |
| `provider` | `ENUM` | NOT NULL | Nombre del proveedor: `'google'`, etc. |
| `provider_id` | `VARCHAR(255)` | NOT NULL | ID del usuario en el proveedor OAuth |
| `access_token` | `TEXT` | NULLABLE | Token de acceso del proveedor |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Fecha de vinculación del proveedor |

---

### 2.3 Session — Sesiones Activas con Refresh Tokens

Permite la gestión de sesiones multi-dispositivo. Cada inicio de sesión crea un registro en esta tabla. Los tokens se revocan en lugar de eliminarse para mantener auditoría.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| 🔑 `id` | `UUID` | PK, NOT NULL | Identificador único de la sesión |
| 🔗 `user_id` | `UUID` | FK → User.id, NOT NULL | Usuario dueño de la sesión |
| `refresh_token` | `TEXT` | UNIQUE, NOT NULL | Refresh token JWT almacenado en DB |
| `expires_at` | `TIMESTAMP` | NOT NULL | Fecha y hora de expiración del token |
| `ip_address` | `VARCHAR(45)` | NULLABLE | IP desde donde se inició la sesión |
| `user_agent` | `TEXT` | NULLABLE | Navegador / dispositivo del usuario |
| `is_revoked` | `BOOLEAN` | DEFAULT false | Indica si el token fue revocado |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Fecha en que se creó la sesión |

---

## 3. Leyenda

| Símbolo | Significado |
|---|---|
| 🔑 | Primary Key (PK) |
| 🔗 | Foreign Key (FK) |
| — | Campo regular |

---

## 4. Relaciones Entre Entidades

```
┌─────────────────┐       ┌──────────────────────┐
│      USER       │       │    OAUTH_PROVIDER    │
├─────────────────┤       ├──────────────────────┤
│ 🔑 id          │──1──N─│ 🔑 id               │
│ email           │       │ 🔗 user_id           │
│ password_hash   │       │ provider (ENUM)      │
│ first_name      │       │ provider_id          │
│ last_name       │       │ access_token         │
│ birth_date      │       │ created_at           │
│ is_active       │       └──────────────────────┘
│ is_email_vrfd   │
│ created_at      │       ┌──────────────────────┐
│ updated_at      │       │       SESSION        │
└─────────────────┘       ├──────────────────────┤
         │                │ 🔑 id               │
         └────────1──N────│ 🔗 user_id           │
                          │ refresh_token        │
                          │ expires_at           │
                          │ ip_address           │
                          │ user_agent           │
                          │ is_revoked           │
                          │ created_at           │
                          └──────────────────────┘
```

| Entidad A | Cardinalidad | Entidad B | Descripción |
|---|---|---|---|
| User | 1 ──── N | OAuthProvider | Un usuario puede tener uno o varios proveedores OAuth vinculados |
| User | 1 ──── N | Session | Un usuario puede tener múltiples sesiones activas (multi-device) |
| OAuthProvider | N ──── 1 | User | Cada proveedor OAuth pertenece a un único usuario |
| Session | N ──── 1 | User | Cada sesión pertenece a un único usuario (CASCADE delete) |

> **Nota:** Se aplica eliminación en cascada (`onDelete: Cascade`). Al borrar un usuario, se eliminan automáticamente todos sus registros de `OAuthProvider` y `Session`.

---

## 5. Flujo de Autenticación

### 5.1 Registro con Email

1. El usuario envía `email`, `password`, `firstName`, `lastName` y `birthDate` (opcional).
2. Se hashea la contraseña con bcrypt (salt rounds: 10).
3. Se crea el registro en `User` con `is_email_verified = false`.
4. Se genera un access token (15 min) y un refresh token (7 días).
5. El refresh token se guarda en la tabla `Session` con `ip_address` y `user_agent`.

### 5.2 Login con Google OAuth

1. El usuario es redirigido a Google mediante `GET /auth/google`.
2. Google retorna el perfil del usuario al callback `GET /auth/google/callback`.
3. Si el email ya existe en `User`: se vincula el `OAuthProvider` al usuario existente.
4. Si el email no existe: se crea un nuevo `User` (`password_hash = null`) y su `OAuthProvider`.
5. Se genera access token y refresh token, se crea sesión en DB.

### 5.3 Renovación de Tokens

1. El cliente envía el refresh token al endpoint `POST /auth/refresh`.
2. Se verifica la firma JWT y se busca el token en la tabla `Session`.
3. Se valida que `is_revoked = false` y que `expires_at > NOW()`.
4. Se genera un nuevo access token. El refresh token no cambia (rolling opcional).

### 5.4 Logout

1. El cliente hace `POST /auth/logout` con el JWT de acceso válido.
2. Se localiza la sesión por `refresh_token` y se marca `is_revoked = true`.
3. El token queda invalidado en siguientes intentos de renovación.

---

## 6. Schema de Prisma

```prisma
// schema.prisma
// Generado para: Portafolio Dinámico - Módulo Auth

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String          @id @default(uuid())
  email           String          @unique
  passwordHash    String?         @map("password_hash")
  firstName       String          @map("first_name")
  lastName        String          @map("last_name")
  birthDate       DateTime?       @map("birth_date") @db.Date
  isActive        Boolean         @default(true)  @map("is_active")
  isEmailVerified Boolean         @default(false) @map("is_email_verified")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt      @map("updated_at")

  oauthProviders  OAuthProvider[]
  sessions        Session[]

  @@map("users")
}

enum OAuthProviderType {
  google

  @@map("oauth_provider_type")
}

model OAuthProvider {
  id          String            @id @default(uuid())
  userId      String            @map("user_id")
  provider    OAuthProviderType
  providerId  String            @map("provider_id")
  accessToken String?           @map("access_token")
  createdAt   DateTime          @default(now()) @map("created_at")

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@map("oauth_providers")
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  refreshToken String   @unique @map("refresh_token")
  expiresAt    DateTime @map("expires_at")
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent")
  isRevoked    Boolean  @default(false) @map("is_revoked")
  createdAt    DateTime @default(now()) @map("created_at")

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

---

## 7. Prompt para Generación con IA

Copia y pega este prompt en Claude, ChatGPT o cualquier LLM para generar el módulo completo:

```
Actúa como un desarrollador senior especialista en NestJS y Prisma.
Genera un módulo de autenticación completo para una aplicación de
portafolios dinámicos con las siguientes especificaciones:

## STACK
- Backend: NestJS (TypeScript)
- ORM: Prisma con PostgreSQL
- Auth: Passport.js + JWT (access + refresh tokens)
- OAuth: Google OAuth 2.0 con passport-google-oauth20
- Hash: bcryptjs
- Validación: class-validator + class-transformer

## BASE DE DATOS
Usa exactamente el schema.prisma proporcionado con los modelos:
User, OAuthProvider y Session.

## ENDPOINTS A IMPLEMENTAR
POST   /auth/register         → Registro con email y contraseña
POST   /auth/login            → Login con email y contraseña
GET    /auth/google           → Redirect a Google OAuth
GET    /auth/google/callback  → Callback de Google OAuth
POST   /auth/refresh          → Renovar access token con refresh token
POST   /auth/logout           → Revocar sesión (requiere auth)
GET    /auth/me               → Obtener usuario autenticado

## FLUJO DE AUTENTICACIÓN
1. Access token: JWT con expiración de 15 minutos.
2. Refresh token: JWT firmado, guardado en tabla Session en DB.
   Expiración de 7 días. Un usuario puede tener múltiples sesiones
   activas (multi-device). Al hacer logout, marcar is_revoked=true.
3. Google OAuth: Si el email ya existe en User, vincular el
   OAuthProvider al usuario existente. Si no existe, crearlo.

## ESTRUCTURA DE ARCHIVOS ESPERADA
src/
  auth/
    dto/
      register.dto.ts
      login.dto.ts
    strategies/
      jwt.strategy.ts
      jwt-refresh.strategy.ts
      google.strategy.ts
    guards/
      jwt-auth.guard.ts
      google-auth.guard.ts
    auth.module.ts
    auth.controller.ts
    auth.service.ts
  users/
    users.module.ts
    users.service.ts
  prisma/
    prisma.module.ts
    prisma.service.ts

## DTOs REQUERIDOS
RegisterDto: email, password (min 8 chars), firstName, lastName,
birthDate (opcional, ISO date string).
LoginDto: email, password.

## VARIABLES DE ENTORNO REQUERIDAS
DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET,
JWT_EXPIRES_IN="15m", JWT_REFRESH_EXPIRES_IN="7d",
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL,
FRONTEND_URL

## CONSIDERACIONES DE SEGURIDAD
- Nunca retornar passwordHash ni refreshToken en las respuestas.
- Validar que el refresh token no esté revocado ni expirado en DB.
- Guardar ip_address y user_agent en la sesión al crear.
- Usar @Exclude() de class-transformer en campos sensibles.

## FORMATO DE RESPUESTA
Genera el código completo de cada archivo, uno por uno, con
comentarios que expliquen la lógica principal. Incluye también
el comando para instalar todas las dependencias necesarias.
```

---

## 8. Dependencias a Instalar

### Producción
```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install passport-google-oauth20 @types/passport-google-oauth20
npm install bcryptjs @types/bcryptjs
npm install class-validator class-transformer
npm install @prisma/client
```

### Desarrollo
```bash
npm install -D prisma @types/passport-jwt
npx prisma init
npx prisma migrate dev --name init_auth
npx prisma generate
```

### Variables de entorno (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/portfolio_db"
JWT_SECRET="tu_secreto_muy_seguro"
JWT_REFRESH_SECRET="tu_refresh_secreto_muy_seguro"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID="tu_google_client_id"
GOOGLE_CLIENT_SECRET="tu_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
FRONTEND_URL="http://localhost:4200"
```

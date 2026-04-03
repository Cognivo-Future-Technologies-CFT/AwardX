# AwardX Backend Proxy Server

This is the backend proxy server for the AwardX application. It acts as a secure intermediary between the frontend and Supabase database, preventing direct exposure of database credentials.

## Features

- 🔒 **Secure**: Database credentials never exposed to the frontend
- 🚀 **Fast**: Express.js-based REST API
- 🛡️ **Protected**: Rate limiting and CORS protection
- 🔐 **Authenticated**: JWT-based authentication via Supabase
- 📝 **Type-safe**: Full TypeScript support

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (admin access)
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Your frontend URL for CORS (default: http://localhost:3000)

Optional Redis caching variables:
- `REDIS_ENABLED` - Set to `true` to enable Redis-backed cache
- `REDIS_URL` - Redis connection URL
- `REDIS_TOKEN` - Optional Redis password/token (provider dependent)
- `REDIS_USERNAME` - Optional username (default: `default`)
- `REDIS_NAMESPACE` - Optional cache key namespace (default: `awardx`)

### 3. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

### 4. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login with email/password
- `POST /api/auth/signin/magic-link` - Login with magic link
- `POST /api/auth/signin/oauth` - OAuth provider login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/user` - Get current user
- `GET /api/auth/session` - Get current session
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/update-password` - Update password

### Organizations
- `GET /api/organizations/:id` - Get organization by ID
- `GET /api/organizations/current/info` - Get current user's organization
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization

### Programs
- `GET /api/programs` - Get all programs
- `GET /api/programs/:id` - Get program by ID
- `POST /api/programs` - Create program
- `PUT /api/programs/:id` - Update program
- `DELETE /api/programs/:id` - Delete program
- `GET /api/programs/:id/stats` - Get program statistics

### Caching
- Redis caching is applied only to read endpoints for organizations/programs/stats.
- Cache key examples:
   - `awardx:org:{id}`
   - `awardx:program:{id}`
   - `awardx:program:{id}:stats`
   - `awardx:programs:org:{organizationId}`
- TTL defaults:
   - `short` (60s): fast-changing stats
   - `medium` (300s): program lists
   - `long` (900s): mostly static entity lookups
- Write endpoints (`POST/PUT/DELETE`) invalidate related keys to keep reads fresh.
- If Redis is unavailable, the server serves uncached data and continues operating.

### Health Check
- `GET /api/health` - Server health check

## Project Structure

```
server/
├── src/
│   ├── middleware/
│   │   └── auth.ts          # Authentication middleware
│   ├── routes/
│   │   ├── auth.ts          # Authentication routes
│   │   ├── organizations.ts # Organization routes
│   │   ├── programs.ts      # Program routes
│   │   └── index.ts         # Route aggregator
│   ├── supabase.ts          # Supabase client setup
│   └── index.ts             # Server entry point
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── package.json
└── tsconfig.json
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Restricted to frontend URL only
- **JWT Validation**: All protected routes require valid JWT token
- **Environment Isolation**: Database credentials never exposed to frontend
- **Safe Caching**: Auth/session-sensitive responses are not cached

## Development

The server uses `ts-node-dev` for hot-reloading during development. Any changes to `.ts` files will automatically restart the server.

## Deployment

For production deployment:

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm start
   ```

## License

MIT

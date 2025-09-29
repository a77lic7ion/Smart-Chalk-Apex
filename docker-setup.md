# Smart Chalk Apex - Docker Setup Guide

This guide will help you set up Smart Chalk Apex using Docker for local development and easy VPS deployment.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git (to clone the repository)
- Your API keys for AI services (Gemini, OpenAI, etc.)

## Quick Start

### 1. Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your API keys:
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key
   OPENAI_API_KEY=your_actual_openai_api_key
   VERCEL_BLOB_READ_WRITE_TOKEN=your_vercel_blob_token (optional)
   ```

### 2. Development Setup

For development with hot reloading:

```bash
# Start the database and backend in development mode
docker-compose -f docker-compose.dev.yml up -d

# Run the frontend locally (recommended for development)
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3001
- Database: localhost:5432

### 3. Production Setup

For production-like environment:

```bash
# Build and start all services
docker-compose up -d --build
```

The application will be available at:
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:3001
- Database: localhost:5432

## Services Overview

### Database (PostgreSQL)
- **Container**: `smart-chalk-db`
- **Port**: 5432
- **Database**: `smart_chalk`
- **User**: `smart_chalk_user`
- **Password**: `smart_chalk_password`
- **Data**: Persisted in Docker volume `postgres_data`

### Backend (Node.js/Express)
- **Container**: `smart-chalk-backend`
- **Port**: 3001
- **Features**: 
  - TypeScript compilation
  - Database migrations on startup
  - Health check endpoint
  - File upload support

### Frontend (React/Vite)
- **Container**: `smart-chalk-frontend`
- **Port**: 80
- **Features**:
  - Nginx reverse proxy
  - API routing to backend
  - Static file serving

## Database Management

### Initial Setup
The database is automatically initialized with the schema when first started.

### Manual Migration Commands
```bash
# Run migrations manually
docker-compose exec backend npm run migrate:up

# Rollback migrations
docker-compose exec backend npm run migrate:down
```

### Database Access
```bash
# Connect to database directly
docker-compose exec database psql -U smart_chalk_user -d smart_chalk
```

## Development Workflow

### Making Changes

1. **Frontend Changes**: 
   - If using dev setup: Changes are hot-reloaded automatically
   - If using production setup: Rebuild with `docker-compose up --build frontend`

2. **Backend Changes**:
   - Development: Container automatically restarts with nodemon
   - Production: Rebuild with `docker-compose up --build backend`

3. **Database Changes**:
   - Create new migration: `docker-compose exec backend npm run migrate create migration_name`
   - Apply migrations: `docker-compose exec backend npm run migrate:up`

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database

# Access container shell
docker-compose exec backend sh
docker-compose exec frontend sh
```

## VPS Deployment

### Preparation

1. **Transfer Files**: Copy your project to the VPS
2. **Environment**: Set up `.env.local` with production values
3. **Domain**: Configure your domain to point to the VPS IP

### Deployment Steps

```bash
# On your VPS
git clone <your-repo-url>
cd Smart-Chalk-Apex

# Set up environment
cp .env.example .env.local
# Edit .env.local with your production API keys

# Start services
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

### Production Considerations

1. **SSL/HTTPS**: Use a reverse proxy like Traefik or nginx-proxy-manager
2. **Backups**: Set up automated database backups
3. **Monitoring**: Consider adding monitoring tools
4. **Updates**: Use `docker-compose pull && docker-compose up -d` for updates

### Recommended VPS Specs

- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB storage
- **OS**: Ubuntu 20.04+ or similar Docker-compatible Linux

## Troubleshooting

### Common Issues

1. **Port Conflicts**: 
   - Change ports in docker-compose.yml if needed
   - Check with `netstat -tulpn | grep :PORT`

2. **Database Connection Issues**:
   - Ensure database is healthy: `docker-compose ps`
   - Check logs: `docker-compose logs database`

3. **API Key Issues**:
   - Verify `.env.local` file exists and has correct keys
   - Restart backend: `docker-compose restart backend`

4. **Build Failures**:
   - Clear Docker cache: `docker system prune -a`
   - Rebuild from scratch: `docker-compose build --no-cache`

### Health Checks

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check database connection
docker-compose exec database pg_isready -U smart_chalk_user
```

## File Structure

```
Smart-Chalk-Apex/
├── docker-compose.yml          # Production setup
├── docker-compose.dev.yml      # Development setup
├── Dockerfile                  # Frontend container
├── nginx.conf                  # Nginx configuration
├── .env.example               # Environment template
├── .env.local                 # Your environment (create this)
├── database/
│   └── init.sql              # Database initialization
└── server/
    ├── Dockerfile            # Backend container
    ├── Dockerfile.dev        # Backend dev container
    └── migrations/           # Database migrations
```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions
# EduPass Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- Domain name (for production)
- SSL certificate (for production)

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/davelee001/edupass.git
cd edupass
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 3. Database Setup

```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql

# Create database
psql -U postgres
CREATE DATABASE edupass;
\q
```

### 4. Configure Environment Variables

#### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=edupass
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key_change_in_production

STELLAR_NETWORK=testnet
ISSUER_PUBLIC_KEY=your_stellar_public_key
ISSUER_SECRET_KEY=your_stellar_secret_key
ASSET_CODE=EDUPASS

FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)

```bash
cd ../frontend
```

Create `.env`:
```
VITE_API_URL=http://localhost:3000/api
```

### 5. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit: http://localhost:5173

## Production Deployment

### Option 1: VPS Deployment (DigitalOcean, Linode, AWS EC2)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Database Setup

```bash
sudo -u postgres psql
CREATE DATABASE edupass;
CREATE USER edupass_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE edupass TO edupass_user;
\q
```

#### 3. Clone and Install

```bash
cd /var/www
sudo git clone https://github.com/davelee001/edupass.git
sudo chown -R $USER:$USER edupass
cd edupass

npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

#### 4. Configure Production Environment

```bash
cd backend
nano .env
```

Set production values:
```
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_NAME=edupass
DB_USER=edupass_user
DB_PASSWORD=secure_password
JWT_SECRET=generate_a_strong_secret
STELLAR_NETWORK=public
ISSUER_PUBLIC_KEY=your_production_stellar_key
ISSUER_SECRET_KEY=your_production_stellar_secret
FRONTEND_URL=https://yourdomain.com
```

#### 5. Build Frontend

```bash
cd ../frontend
nano .env.production
```

```
VITE_API_URL=https://yourdomain.com/api
```

```bash
npm run build
```

#### 6. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/edupass
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /var/www/edupass/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/edupass /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 8. Start Backend with PM2

```bash
cd /var/www/edupass/backend
pm2 start src/server.js --name edupass-api
pm2 save
pm2 startup
```

#### 9. Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
```

#### 2. Create Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

#### 3. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: edupass
      POSTGRES_USER: edupass
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - edupass-network

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_NAME: edupass
      DB_USER: edupass
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      STELLAR_NETWORK: ${STELLAR_NETWORK}
      ISSUER_PUBLIC_KEY: ${ISSUER_PUBLIC_KEY}
      ISSUER_SECRET_KEY: ${ISSUER_SECRET_KEY}
    depends_on:
      - postgres
    networks:
      - edupass-network

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - edupass-network

volumes:
  postgres_data:

networks:
  edupass-network:
```

#### 4. Deploy with Docker

```bash
docker-compose up -d
```

### Option 3: Serverless Deployment

#### Vercel (Frontend) + Railway (Backend + Database)

**Frontend on Vercel:**

```bash
cd frontend
npm install -g vercel
vercel
```

**Backend on Railway:**

1. Visit https://railway.app
2. Create new project
3. Add PostgreSQL service
4. Deploy from GitHub
5. Set environment variables

### Option 4: Platform-as-a-Service

#### Heroku Deployment

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create edupass-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
heroku config:set STELLAR_NETWORK=testnet
# ... other variables

# Deploy
git push heroku main
```

## Database Migration

### Backup Database

```bash
pg_dump -U postgres edupass > backup.sql
```

### Restore Database

```bash
psql -U postgres edupass < backup.sql
```

## Monitoring & Maintenance

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs edupass-api

# Restart application
pm2 restart edupass-api
```

### 2. Database Maintenance

```bash
# Backup database daily
0 2 * * * pg_dump -U edupass_user edupass > /backups/edupass_$(date +\%Y\%m\%d).sql

# Clean old logs
find /var/www/edupass/backend/logs -name "*.log" -mtime +30 -delete
```

### 3. SSL Certificate Renewal

```bash
# Certbot auto-renewal (runs twice daily)
sudo certbot renew --dry-run
```

### 4. Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update npm packages
cd /var/www/edupass/backend
npm audit fix

cd ../frontend
npm audit fix
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or cloud load balancer
2. **Multiple Backend Instances**: Deploy multiple PM2 instances
3. **Database Replication**: Set up PostgreSQL read replicas
4. **CDN**: Use Cloudflare or AWS CloudFront for frontend

### Vertical Scaling

1. **Increase server resources** (CPU, RAM)
2. **Optimize database** (indexes, query optimization)
3. **Connection pooling** (already configured)

## Troubleshooting

### Backend won't start
- Check database connection
- Verify environment variables
- Check logs: `pm2 logs`

### Database connection error
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in .env
- Ensure database exists

### Stellar transactions failing
- Verify network (testnet vs public)
- Check issuer account has XLM balance
- Verify trustlines are established

### Frontend shows API errors
- Check CORS settings in backend
- Verify API_URL in frontend .env
- Check network tab in browser DevTools

## Support & Resources

- GitHub Issues: https://github.com/davelee001/edupass/issues
- Stellar Discord: https://discord.gg/stellardev
- Stack Overflow: Tag `stellar` or `edupass`

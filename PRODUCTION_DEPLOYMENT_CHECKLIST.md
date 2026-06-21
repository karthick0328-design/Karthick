# 🚀 Production Deployment Security Checklist

**Project:** Biology Research Platform  
**Last Updated:** February 17, 2026  
**Purpose:** Ensure secure deployment to production environment

---

## ☑️ Pre-Deployment Security Requirements

### 1. Environment Configuration

#### Backend Environment Variables (.env)
```bash
# Required - Replace with actual production values
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/biology?retryWrites=true&w=majority&ssl=true

# Authentication
JWT_SECRET=<GENERATE_STRONG_SECRET_HERE>  # Use: openssl rand -base64 64
JWT_EXPIRES_IN=24h

# Frontend URL (HTTPS required)
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=<APP_SPECIFIC_PASSWORD>
EMAIL_FROM=noreply@yourdomain.com

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=/var/app/uploads

# Security
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100
SESSION_SECRET=<GENERATE_STRONG_SECRET_HERE>

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/biology-app/app.log
```

**Action Items:**
- [ ] Generate strong JWT_SECRET: `openssl rand -base64 64`
- [ ] Generate SESSION_SECRET: `openssl rand -base64 32`
- [ ] Configure production MongoDB with SSL/TLS enabled
- [ ] Set up email SMTP credentials
- [ ] Verify all environment variables are set
- [ ] **NEVER** commit .env file to version control

---

#### Frontend Environment Variables (.env.production)
```bash
# API Configuration (HTTPS required)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com

# Application
NEXT_PUBLIC_APP_NAME="Biology Research Platform"
NEXT_PUBLIC_APP_VERSION=1.0.0

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Action Items:**
- [ ] Update API URLs to production HTTPS endpoints
- [ ] Configure WebSocket URL for Socket.IO
- [ ] Set up analytics IDs if using
- [ ] Build and test production bundle: `npm run build`

---

### 2. SSL/TLS Configuration

#### Obtain SSL Certificate
**Options:**
1. **Let's Encrypt** (Free)
   ```bash
   sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
   ```

2. **Commercial Certificate** (Paid)
   - Purchase from CA (DigiCert, Sectigo, etc.)
   - Follow CA instructions for verification

**Action Items:**
- [ ] Obtain SSL certificate for domain
- [ ] Configure auto-renewal for Let's Encrypt
- [ ] Test SSL configuration: https://www.ssllabs.com/ssltest/
- [ ] Achieve A+ rating on SSL Labs test

---

#### Nginx Configuration (Recommended)
```nginx
# /etc/nginx/sites-available/biology-app

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
    }

    # WebSocket for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limiting zone
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
}
```

**Action Items:**
- [ ] Install and configure Nginx
- [ ] Set up rate limiting zones
- [ ] Configure proxy settings
- [ ] Test Nginx configuration: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`

---

### 3. MongoDB Security Hardening

#### Update Connection String
```javascript
// backend/config/database.js or similar
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Security options
      ssl: true,
      sslValidate: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      
      // Connection pooling
      maxPoolSize: 10,
      minPoolSize: 2,
      
      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected securely');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

**MongoDB Atlas Security Checklist:**
- [ ] Enable IP whitelist (allow only production server IPs)
- [ ] Use strong password (minimum 20 characters, mixed case, numbers, symbols)
- [ ] Enable database encryption at rest
- [ ] Enable authentication
- [ ] Configure backup retention (7-30 days recommended)
- [ ] Set up monitoring alerts
- [ ] Review and restrict user permissions (least privilege principle)

---

### 4. Application Security Updates

#### Install Security Packages
```bash
cd backend
npm install helmet express-rate-limit express-mongo-sanitize hpp xss-clean cors
```

#### Update server.js
```javascript
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const app = express();

// Security Middleware
// 1. Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 2. CORS - Configure properly
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Data Sanitization against NoSQL injection
app.use(mongoSanitize());

// 6. Data Sanitization against XSS
app.use(xss());

// 7. Prevent HTTP Parameter Pollution
app.use(hpp());

// ... rest of your app configuration
```

**Action Items:**
- [ ] Install security packages
- [ ] Add security middleware to server.js
- [ ] Configure CSP headers appropriately
- [ ] Test rate limiting
- [ ] Update CORS origins for production

---

### 5. Dependency Security

#### Update All Dependencies
```bash
# Backend
cd backend
npm audit fix
npm update

# Frontend
cd ../frontend
npm audit fix
npm update
```

**Action Items:**
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Update MongoDB driver to latest version (8.19.4 or higher)
- [ ] Review and update all outdated packages
- [ ] Test application after updates
- [ ] Document any breaking changes

---

### 6. Logging & Monitoring

#### Configure Winston Logger
```javascript
// backend/config/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'biology-platform' },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_FILE || './logs', 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_FILE || './logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

**Action Items:**
- [ ] Configure centralized logging (e.g., ELK Stack, CloudWatch)
- [ ] Set up error alerting (email/Slack on critical errors)
- [ ] Configure log rotation
- [ ] Monitor disk space for log files
- [ ] Review logs daily for suspicious activity

---

### 7. Firewall & Network Security

#### Server Firewall Configuration (UFW - Ubuntu)
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP (for Let's Encrypt)
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Additional Security:**
- [ ] Configure fail2ban to prevent brute force attacks
- [ ] Disable root SSH login
- [ ] Use SSH keys instead of passwords
- [ ] Change default SSH port (optional)
- [ ] Configure database firewall rules (MongoDB Atlas IP whitelist)

---

### 8. File Upload Security

#### Multer Configuration Update
```javascript
// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
```

**Action Items:**
- [ ] Configure file upload size limits
- [ ] Validate file types on server-side
- [ ] Store files outside web root
- [ ] Scan uploaded files for malware (optional: ClamAV)
- [ ] Implement file download with proper content-type headers

---

### 9. Authentication & Authorization

#### JWT Token Security
```javascript
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Explicitly specify algorithm
      maxAge: process.env.JWT_EXPIRES_IN || '24h'
    });

    // Optional: Check token blacklist for logout functionality
    // const isBlacklisted = await checkTokenBlacklist(token);
    // if (isBlacklisted) throw new Error('Token has been revoked');

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = auth;
```

**Action Items:**
- [ ] Use strong JWT secret (64+ characters)
- [ ] Set appropriate token expiration (24h recommended)
- [ ] Implement refresh token mechanism
- [ ] Store tokens securely (httpOnly cookies for web)
- [ ] Implement token blacklist for logout
- [ ] Add multi-factor authentication (optional but recommended)

---

### 10. Database Backup & Recovery

#### Automated Backup Script
```bash
#!/bin/bash
# /home/user/scripts/backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
MONGODB_URI="your_mongodb_connection_string"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$BACKUP_DIR/backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Delete backups older than 30 days
find $BACKUP_DIR -type f -name "backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

**Cron Job (Daily at 2 AM):**
```bash
0 2 * * * /home/user/scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

**Action Items:**
- [ ] Set up automated daily backups
- [ ] Test backup restoration process
- [ ] Store backups in separate location (S3, etc.)
- [ ] Configure backup retention policy
- [ ] Document recovery procedures

---

### 11. Performance & Scalability

#### PM2 Process Manager (Production)
```bash
# Install PM2
npm install -g pm2

# Backend ecosystem config
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'biology-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/pm2/biology-backend-error.log',
    out_file: '/var/log/pm2/biology-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
  }]
};

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
```

**Frontend (Next.js):**
```bash
# Build production bundle
npm run build

# Start with PM2
pm2 start npm --name "biology-frontend" -- start

# Or use standalone Next.js
npm run build
npm run start
```

**Action Items:**
- [ ] Configure PM2 for backend
- [ ] Set up automatic restart on crashes
- [ ] Configure log rotation for PM2
- [ ] Implement health check endpoints
- [ ] Set up monitoring (CPU, memory, response times)

---

### 12. Testing Before Deployment

#### Security Testing Checklist
```bash
# 1. Run Snyk security scan
snyk test
snyk code test

# 2. Run audit
npm audit

# 3. Test SSL configuration
# Visit: https://www.ssllabs.com/ssltest/

# 4. Test security headers
# Visit: https://securityheaders.com/

# 5. Run OWASP ZAP or similar penetration testing tools
```

**Manual Testing:**
- [ ] Test login/logout functionality
- [ ] Verify file upload restrictions
- [ ] Test XSS prevention (try malicious inputs)
- [ ] Test SQL/NoSQL injection prevention
- [ ] Verify rate limiting works
- [ ] Test CORS configuration
- [ ] Verify all HTTPS redirects work
- [ ] Test WebSocket connections
- [ ] Verify error messages don't leak sensitive info

---

### 13. Post-Deployment Monitoring

#### Health Check Endpoint
```javascript
// backend/routes/health.js
app.get('/api/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    database: 'disconnected'
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthcheck.database = 'connected';
    }
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).json(healthcheck);
  }
});
```

**Monitoring Tools:**
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure application performance monitoring (New Relic, DataDog)
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Monitor server resources (CPU, RAM, disk)
- [ ] Set up alerts for:
  - Server downtime
  - High error rates
  - Database connection failures
  - Disk space warnings
  - Memory leaks

---

## 🎯 Final Deployment Steps

### Step 1: Pre-Flight Verification
- [ ] All environment variables configured
- [ ] SSL certificates installed and tested
- [ ] Database backups working
- [ ] Security middleware installed
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Monitoring set up

### Step 2: Deploy Backend
```bash
# On production server
git clone <repository-url>
cd biology/backend
npm install --production
cp .env.example .env
# Edit .env with production values
pm2 start ecosystem.config.js
pm2 save
```

### Step 3: Deploy Frontend
```bash
cd ../frontend
npm install
# Edit .env.production with production values
npm run build
pm2 start npm --name "biology-frontend" -- start
pm2 save
```

### Step 4: Configure Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/biology-app
sudo ln -s /etc/nginx/sites-available/biology-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Verify Deployment
- [ ] Visit https://yourdomain.com
- [ ] Test login functionality
- [ ] Check all API endpoints
- [ ] Verify WebSocket connections
- [ ] Test file uploads
- [ ] Check logs for errors
- [ ] Run smoke tests

### Step 6: Security Verification
- [ ] SSL Labs: Grade A or higher
- [ ] Security Headers: Grade A or higher
- [ ] No console errors in browser
- [ ] No security warnings
- [ ] Rate limiting working
- [ ] CORS properly configured

---

## 🚨 Rollback Plan

If deployment fails:
1. **Revert to previous version:** `pm2 restart <app-name> --update-env`
2. **Check logs:** `pm2 logs <app-name>`
3. **Restore database backup if needed**
4. **Document the issue**
5. **Fix in staging environment**
6. **Re-deploy after testing**

---

## 📞 Emergency Contacts

- **DevOps Team:** devops@yourdomain.com
- **Security Team:** security@yourdomain.com
- **Database Admin:** dba@yourdomain.com
- **On-Call Developer:** +XX-XXXX-XXXXXX

---

## ✅ Sign-Off

**Deployment Completed By:** ____________________  
**Date:** ____________________  
**Production URL:** https://yourdomain.com  
**Verification Status:** ☐ Passed ☐ Failed  

**Notes:**
________________________________________________
________________________________________________
________________________________________________

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026  
**Next Review:** Before each deployment

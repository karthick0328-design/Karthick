# 🛡️ Security Quick Reference Guide

**Project:** Biology Research Platform  
**For:** Development & Operations Team  
**Last Updated:** February 17, 2026

---

## 🔑 Common Security Tasks

### Running Security Scans

#### Full Security Audit
```bash
# Snyk Code Analysis (High severity only)
snyk code test --severity-threshold=high e:/biology

# NPM Audit
cd backend && npm audit
cd ../frontend && npm audit

# Both together with JSON output
snyk code test --json e:/biology > security_scan.json
npm audit --json > npm_audit.json
```

#### Quick Vulnerability Check
```bash
# Backend
cd e:/biology/backend
npm audit

# Frontend
cd e:/biology/frontend
npm audit
```

---

## 🔒 validateURL() Function Usage

### Purpose
Prevents XSS and Open Redirect vulnerabilities by sanitizing URLs before use in DOM.

### Import
```typescript
import { validateURL } from '@/lib/validation';
```

### Usage Examples

#### Image Sources
```tsx
// ❌ BEFORE (Vulnerable)
<img src={userProvidedURL} alt="profile" />

// ✅ AFTER (Secure)
<img src={validateURL(userProvidedURL)} alt="profile" />
```

#### Link Attributes
```tsx
// ❌ BEFORE (Vulnerable)
<a href={socialLink.linkedin}>LinkedIn</a>

// ✅ AFTER (Secure)
<a 
  href={validateURL(socialLink.linkedin)} 
  target="_blank" 
  rel="noopener noreferrer"
>
  LinkedIn
</a>
```

#### Window.open()
```tsx
// ❌ BEFORE (Vulnerable)
window.open(fileUrl, '_blank')

// ✅ AFTER (Secure)
window.open(validateURL(fileUrl), '_blank', 'noopener,noreferrer')
```

#### Component Props
```tsx
// ❌ BEFORE (Vulnerable)
<VoicePlayer url={audioUrl} />

// ✅ AFTER (Secure)
<VoicePlayer url={validateURL(audioUrl)} />
```

### Blocked Protocols
The following protocols are automatically blocked:
- `javascript:`
- `data:`
- `vbscript:`
- `file:`
- `about:`
- `ms-*`
- `shell:`
- `res:`

### Allowed Patterns
- `http://` and `https://` URLs
- `blob:` URLs (for file downloads)
- Relative paths: `/`, `./`, `../`
- Anchor links: `#`
- Empty or invalid URLs → Returns `#`

---

## 🚫 Common Security Anti-Patterns

### DO NOT Use These

#### 1. dangerouslySetInnerHTML
```tsx
// ❌ NEVER DO THIS
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ DO THIS INSTEAD
<div>{sanitizedContent}</div>
// Or use a library like DOMPurify if HTML rendering is required
```

#### 2. Direct URL Usage
```tsx
// ❌ VULNERABLE
<a href={user.website}>Visit</a>

// ✅ SECURE
<a href={validateURL(user.website)} target="_blank" rel="noopener noreferrer">
  Visit
</a>
```

#### 3. Eval or Function Constructor
```javascript
// ❌ NEVER DO THIS
eval(userInput);
new Function(userInput)();

// No safe alternative - redesign the feature
```

#### 4. Unvalidated File Paths
```javascript
// ❌ VULNERABLE
fs.readFile(userInput, callback);

// ✅ SECURE
const safePath = path.join(UPLOAD_DIR, path.basename(userInput));
if (safePath.startsWith(UPLOAD_DIR)) {
  fs.readFile(safePath, callback);
}
```

---

## 🌐 Environment Variables

### Development (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NODE_ENV=development
```

### Production (.env.production)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NODE_ENV=production
```

### Security Rules
- ✅ **DO** use environment variables for all URLs
- ✅ **DO** commit `.env.example` files
- ❌ **NEVER** commit actual `.env` files
- ❌ **NEVER** hardcode sensitive data
- ✅ **DO** rotate secrets regularly

---

## 🔐 Authentication Best Practices

### JWT Tokens

#### Secure Storage
```typescript
// ✅ CORRECT - HTTP-only cookie (server-side)
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});

// ⚠️ ACCEPTABLE - LocalStorage (client-side SPA)
// Only if cookies aren't feasible
localStorage.setItem('token', jwt);

// ❌ NEVER - Plain cookie without httpOnly
res.cookie('token', jwt); // Vulnerable to XSS
```

#### Token Verification
```javascript
// ✅ SECURE
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'], // Explicitly specify algorithm
  maxAge: '24h'
});

// ❌ INSECURE
const decoded = jwt.decode(token); // No verification!
```

### Password Hashing
```javascript
const bcrypt = require('bcryptjs');

// ✅ CORRECT - Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ CORRECT - Verify password
const isMatch = await bcrypt.compare(password, hashedPassword);

// ❌ NEVER store plain passwords
user.password = password; // NEVER DO THIS
```

---

## 📡 API Security

### CORS Configuration
```javascript
// ✅ PRODUCTION
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ⚠️ DEVELOPMENT ONLY
app.use(cors({
  origin: '*' // Only for development!
}));
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// ✅ General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});
app.use('/api/', apiLimiter);

// ✅ Strict auth rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // Only 5 login attempts per window
});
app.use('/api/auth/login', authLimiter);
```

### Input Validation
```javascript
// ✅ ALWAYS validate and sanitize input
const { body, validationResult } = require('express-validator');

app.post('/api/users', [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('password').isLength({ min: 8 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process validated data
});
```

---

## 📝 Logging Best Practices

### What to Log
✅ **DO log:**
- Authentication attempts (success/failure)
- Authorization failures
- Input validation failures
- System errors
- Critical operations (data changes)
- API requests (with rate limiting)

❌ **NEVER log:**
- Passwords
- API keys/secrets
- Credit card numbers
- Personal identification numbers
- Full JWTs

### Secure Logging Example
```javascript
// ✅ GOOD
logger.info('User login attempt', { 
  email: user.email, 
  ip: req.ip,
  timestamp: new Date()
});

// ❌ BAD
logger.info('User login', { 
  email: user.email, 
  password: req.body.password  // NEVER LOG PASSWORDS!
});
```

---

## 🗄️ Database Security

### MongoDB Query Sanitization
```javascript
const mongoSanitize = require('express-mongo-sanitize');

// Middleware to prevent NoSQL injection
app.use(mongoSanitize());

// ✅ SAFE - Using sanitized input
const user = await User.findOne({ email: req.body.email });

// ❌ UNSAFE - Direct query from user input (if no sanitization)
const user = await User.findOne(req.body); // Could contain $where, etc.
```

### Parameterized Queries
```javascript
// ✅ SAFE
const user = await User.findOne({ 
  email: sanitizedEmail,
  role: 'user'
});

// ❌ UNSAFE - String concatenation
const query = `SELECT * FROM users WHERE email='${email}'`; // SQL Injection!
```

---

## 🖼️ File Upload Security

### Validate File Types
```javascript
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};
```

### Limit File Size
```javascript
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter
});
```

### Generate Secure Filenames
```javascript
const crypto = require('crypto');

const filename = (file) => {
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(file.originalname);
  return `${Date.now()}-${uniqueId}${extension}`;
};
```

---

## 🔍 Security Testing Commands

### Manual Security Tests

#### 1. XSS Testing
Try these inputs in forms:
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
```
**Expected:** All should be sanitized/blocked

#### 2. SQL/NoSQL Injection
Try these in login forms:
```json
{ "$gt": "" }
' OR '1'='1
admin'--
```
**Expected:** All should be rejected

#### 3. Path Traversal
```
../../../etc/passwd
..%2F..%2F..%2Fetc%2Fpasswd
```
**Expected:** Should be blocked/sanitized

### Automated Security Scans

#### Using Snyk
```bash
# Install Snyk globally
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Test code for security issues
snyk code test

# Monitor project
snyk monitor
```

#### Using OWASP ZAP
1. Install ZAP from https://www.zaproxy.org/
2. Point to your application URL
3. Run automated scan
4. Review findings
5. Fix critical/high severity issues

---

## 🚨 Incident Response

### If a Security Breach Occurs

#### Immediate Actions (0-1 hour)
1. **Isolate** affected systems
2. **Preserve** logs and evidence
3. **Notify** security team
4. **Assess** scope of breach
5. **Document** everything

#### Short-term Actions (1-24 hours)
1. **Contain** the breach
2. **Patch** vulnerabilities
3. **Rotate** all secrets/credentials
4. **Notify** affected users (if applicable)
5. **Monitor** for continued suspicious activity

#### Long-term Actions (1-7 days)
1. **Root cause analysis**
2. **Implement** preventive measures
3. **Update** security procedures
4. **Train** team on lessons learned
5. **Review** and improve monitoring

### Contact Information
- **Security Team:** security@yourdomain.com
- **On-Call Security:** +XX-XXXX-XXXXXX
- **Legal/Compliance:** legal@yourdomain.com

---

## 📚 Security Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

### Tools
- [Snyk](https://snyk.io/) - Vulnerability scanning
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency auditing
- [OWASP ZAP](https://www.zaproxy.org/) - Penetration testing
- [SSL Labs](https://www.ssllabs.com/ssltest/) - SSL/TLS testing

### Training
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/) - Hands-on security training
- [HackerOne CTF](https://www.hackerone.com/hackers/hacker101) - Capture the flag
- [PentesterLab](https://pentesterlab.com/) - Practical web security

---

## ✅ Quick Security Checklist

Before each deployment:
- [ ] All dependencies updated and audited
- [ ] Snyk scan shows no high/critical issues
- [ ] Environment variables configured for HTTPS
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Authentication/authorization working
- [ ] Logs configured and monitored
- [ ] Backups tested
- [ ] SSL certificate valid and A+ rated

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026  
**Maintained By:** Security Team  
**Review Schedule:** Monthly

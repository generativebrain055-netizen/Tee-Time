# TeeTime Documentation

## 📚 Documentation Index

| Document                                     | Description                                    |
| -------------------------------------------- | ---------------------------------------------- |
| [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)       | Complete AWS deployment guide with HTTPS setup |
| [API_REFERENCE.md](API_REFERENCE.md)         | API endpoints reference                        |
| [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) | Local development environment setup            |

## 🚀 Quick Start

### For Deployment (Production)

See [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for complete instructions.

**TL;DR:**

1. Launch EC2 instance (Amazon Linux 2023)
2. Install Node.js 20.x
3. Deploy backend code
4. Configure environment variables
5. Set up PM2 process manager
6. Create ALB with ACM certificate
7. Configure DNS

### For API Integration

See [API_REFERENCE.md](API_REFERENCE.md) for all endpoints.

**Base URL:** `https://api.yourdomain.com`

**Authentication:** Bearer token in `Authorization` header

### For Local Development

See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for setup instructions.

## 📁 Project Structure

```
TeeTime/
├── backend/           # Node.js Express API
│   ├── controllers/   # HTTP request handlers
│   ├── services/      # Business logic
│   ├── repositories/  # Database access
│   ├── formatters/    # Response formatting
│   ├── routes/        # API route definitions
│   └── middleware/    # Auth, validation, rate limiting
├── TTSGolfApp/        # React Native Expo app
│   ├── screens/       # App screens
│   ├── components/    # Reusable components
│   ├── services/      # API client services
│   └── stores/        # State management
└── docs/              # Documentation (you are here)
```

## 🔐 Security Features

- JWT authentication with refresh tokens
- OAuth 2.0 (Google, Apple Sign In)
- Rate limiting on all endpoints
- CORS protection
- Helmet security headers
- Input validation on all routes
- HTTPS via AWS ALB + ACM

## 📞 Support

For deployment issues:

1. Check PM2 logs: `pm2 logs teetime-api`
2. Verify health endpoint: `curl https://api.yourdomain.com/health`
3. Check AWS CloudWatch logs

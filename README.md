# API Portal

A comprehensive API documentation and management platform built with Next.js and NestJS.

## Overview

API Portal is a full-stack web application designed to manage, document, and test APIs. It provides:

- 📚 **API Documentation** - Beautiful, interactive API documentation viewer
- 🔐 **Access Control** - Role-based access management (ADMIN, DEVELOPER, GUEST)
- 📤 **API Upload** - Easy API specification (OpenAPI/Swagger) upload
- 👥 **User Management** - Admin panel for user and project management
- 📱 **Responsive Design** - Full mobile, tablet, and desktop support
- 🎨 **Dark Mode** - Modern dark theme with custom styling

## Project Structure

```
api-portal/
├── backend/                  # NestJS API Server
│   ├── src/
│   │   ├── main.ts         # Entry point
│   │   ├── app.module.ts   # Root module
│   │   ├── prisma/         # Database module
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
│
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── login/            # Authentication
│   │   │   ├── docs/             # API Documentation
│   │   │   ├── admin/            # Admin panel
│   │   │   ├── upload/           # API upload
│   │   │   ├── access-control/   # Access management
│   │   │   └── Sidebar.tsx       # Navigation
│   │   └── components/
│   └── package.json
│
└── README.md
```

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT Bearer Token
- **API**: RESTful API with OpenAPI support

### Frontend
- **Framework**: Next.js 16.2.9 with Turbopack
- **UI**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks

## Prerequisites

- Node.js >= 18.x
- npm or yarn
- Git

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/Kporame/API_backend.git backend
git clone https://github.com/Kporame/API_frontend.git frontend
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run build
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
```

## Running Locally

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
# Runs on http://localhost:4010
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Production Mode

**Backend:**
```bash
cd backend
npm run start:prod
# PORT environment variable controls the port
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## Configuration

### Backend Environment Variables
```env
PORT=4010                           # Server port
DATABASE_URL=file:./dev.db         # SQLite database path
```

### Database Management

#### Open Prisma Studio
Prisma Studio is a visual database editor. Open it with:

```bash
# Local development
npx prisma studio

# Docker container
docker exec -d api-portal-backend npx prisma studio --hostname 0.0.0.0 --port 5555
```

Then access Prisma Studio at:
- Local: http://localhost:5555
- Remote: http://143.198.88.74:5555

### Remote Deployment
For deploying to a remote server (e.g., 143.198.88.74:5555):

1. Set `PORT=5555` in docker-compose environment
2. Update frontend API URL to point to remote backend
3. Configure CORS and authentication headers

## Features

### 🔐 Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Token stored in localStorage and cookies
- Bearer token in API requests: `Authorization: Bearer {token}`

### 📚 API Documentation
- Interactive API specification viewer
- Endpoint testing interface
- Search functionality
- Visibility controls for projects and endpoints

### 👥 User Management
- Admin panel for user management
- Project access control
- Role assignment (ADMIN, DEVELOPER, GUEST)
- User project visibility

### 📱 Responsive Design
- Mobile-first approach
- Hamburger menu drawer on mobile
- Breakpoint: md (768px) for responsive transitions
- Fully functional on all device sizes

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details

### Users (Admin Only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `DELETE /api/users/:id` - Delete user

### Upload
- `POST /api/upload` - Upload API specification

### Access Control
- `GET /api/access` - Get access list
- `POST /api/access` - Grant access
- `DELETE /api/access/:id` - Revoke access

## Database Schema

### Users Table
- `id` - UUID primary key
- `email` - Email address (unique)
- `password` - Hashed password
- `role` - ADMIN | DEVELOPER | GUEST
- `name` - User name
- `createdAt` - Timestamp

### Projects Table
- `id` - UUID primary key
- `name` - Project name
- `version` - API version
- `spec` - API specification (JSON)
- `createdBy` - Creator user ID
- `createdAt` - Timestamp

### ProjectAccess Table
- `id` - UUID primary key
- `userId` - User ID
- `projectId` - Project ID
- `role` - VIEWER | EDITOR | OWNER
- `grantedAt` - Timestamp

## Testing

### Run Tests
```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

### Lint Code
```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## Deployment

### Docker Deployment
```bash
docker-compose build
docker-compose up -d
```

### Environment Configuration
Set these environment variables in `docker-compose.yml`:
- `PORT=5555` - For backend port
- `DATABASE_URL=file:./dev.db` - Database path
- `NODE_ENV=production` - Production mode

## Repositories

- **Backend**: https://github.com/Kporame/API_backend.git
- **Frontend**: https://github.com/Kporame/API_frontend.git

## Features Implemented

### Phase 1 ✅
- [x] User authentication and authorization
- [x] API documentation viewer
- [x] API upload functionality
- [x] User management admin panel
- [x] Access control system
- [x] Responsive web design
- [x] Hamburger menu drawer (mobile)
- [x] Dark theme styling

### Phase 2 🔄
- [ ] Export API documentation
- [ ] API version management
- [ ] GitHub integration
- [ ] Advanced search and filtering
- [ ] Webhook support

## Troubleshooting

### Backend Connection Issues
- Verify `PORT` environment variable is set correctly
- Check firewall rules for port access
- Ensure database file exists at specified path

### Frontend Not Loading
- Clear browser cache (Ctrl+Shift+Delete)
- Check console (F12) for errors
- Verify backend is running
- Check API URL configuration

### Database Errors
- Run `npx prisma migrate dev` to sync schema
- Check `dev.db` file permissions
- Delete `dev.db` and rerun migrations to reset

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or feedback, please open an issue on GitHub or contact the development team.

## Version History

### v1.0.0 (Current)
- Initial release
- Full responsive design with mobile support
- Hamburger menu system
- Complete user and project management
- API documentation viewer and testing

---

**Last Updated**: July 2, 2026  
**Maintained by**: Kporame Team

# Admin System Documentation

## Overview
The admin system provides secure authentication, role-based permissions, and comprehensive data management capabilities for platform administrators.

## Admin Roles

### 1. Super Admin
- Full access to all features
- Can create/manage other admins
- Can view all analytics
- Can delete data
- Highest privilege level

### 2. Admin
- Manage fraud cases
- Manage reports
- View analytics
- Cannot manage other admins
- Cannot delete critical data

### 3. Moderator
- View fraud cases and reports
- Basic analytics access
- Limited data modification
- Entry-level admin role

## Permissions System

```typescript
{
  canManageFraud: boolean,      // Manage fraud cases
  canManageReports: boolean,    // Manage user reports
  canManageUsers: boolean,      // Suspend/activate users
  canViewAnalytics: boolean,    // View platform analytics
  canDeleteData: boolean,       // Delete records
  canManageAdmins: boolean      // Manage admin accounts
}
```

## API Endpoints

### Authentication

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "65f1234567890abcdef12345",
    "name": "Admin Name",
    "email": "admin@example.com",
    "role": "super_admin",
    "permissions": {
      "canManageFraud": true,
      "canManageReports": true,
      "canManageUsers": true,
      "canViewAnalytics": true,
      "canDeleteData": true,
      "canManageAdmins": true
    }
  }
}
```

**Security Features:**
- Account locks after 5 failed attempts (30 minutes)
- 8-hour JWT token expiration
- bcrypt password hashing
- Rate limiting on login endpoint

---

### Admin Management (Super Admin Only)

#### Create Admin
```http
POST /api/admin/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "password123",
  "role": "admin",
  "permissions": {
    "canManageFraud": true,
    "canManageReports": true,
    "canManageUsers": false,
    "canViewAnalytics": true,
    "canDeleteData": false,
    "canManageAdmins": false
  }
}
```

#### List All Admins
```http
GET /api/admin/list
Authorization: Bearer <token>
```

#### Update Admin Permissions
```http
PATCH /api/admin/:adminId/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin",
  "permissions": {
    "canManageUsers": true,
    "canDeleteData": true
  }
}
```

#### Update Admin Status
```http
PATCH /api/admin/:adminId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "suspended"
}
```
Status options: `active`, `suspended`, `inactive`

---

### Dashboard & Analytics

#### Get Dashboard Statistics
```http
GET /api/admin/data/dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "stats": {
    "users": {
      "total": 1250,
      "new24h": 15
    },
    "orders": {
      "total": 3420,
      "new24h": 45
    },
    "fraud": {
      "total": 23,
      "active": 8,
      "new24h": 2
    },
    "reports": {
      "total": 67,
      "pending": 12,
      "new24h": 5
    }
  }
}
```

#### Get Analytics
```http
GET /api/admin/data/analytics?period=7days
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `24h`, `7days`, `30days` (default: 7days)

**Response:**
```json
{
  "period": "7days",
  "analytics": {
    "userGrowth": [
      { "_id": "2026-01-15", "count": 12 },
      { "_id": "2026-01-16", "count": 18 }
    ],
    "orderTrends": [
      { "_id": "2026-01-15", "count": 45, "totalRevenue": 2340.50 }
    ],
    "fraudTrends": [
      { "_id": "2026-01-15", "count": 3, "avgScore": 72.5 }
    ]
  }
}
```

---

### User Management

#### Get All Users
```http
GET /api/admin/data/users?search=john&status=true&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `search`: Search by name or email
- `status`: Filter by status (true/false)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

#### Get User Details
```http
GET /api/admin/data/users/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "65f1234567890abcdef12345",
    "name": "John Doe",
    "email": "john@example.com",
    "status": true,
    "createdAt": "2026-01-15T10:30:00Z"
  },
  "orders": 45,
  "fraudCases": 0,
  "reportsBy": 2,
  "reportsAgainst": 0
}
```

#### Update User Status
```http
PATCH /api/admin/data/users/:userId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": false
}
```

---

### Orders Management

#### Get All Orders
```http
GET /api/admin/data/orders?status=pending&minPrice=50&maxPrice=500&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by order status
- `minPrice`: Minimum order price
- `maxPrice`: Maximum order price
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

---

### Search

#### Search Platform
```http
GET /api/admin/data/search?query=john&type=users
Authorization: Bearer <token>
```

**Query Parameters:**
- `query`: Search term (required)
- `type`: `users`, `fraud`, `reports` (optional, searches all if omitted)

**Response:**
```json
{
  "results": {
    "users": [...],
    "fraudCases": [...],
    "reports": [...]
  }
}
```

---

## Security Implementation

### JWT Token Authentication
All admin routes (except login) require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Permission Checks
Middleware automatically verifies:
1. Token validity
2. Admin account status (active)
3. Required permissions for the endpoint
4. Role-based access (super_admin, admin, moderator)

### Password Requirements
- Minimum 8 characters
- Hashed with bcrypt (10 rounds)
- Password not returned in responses

### Account Locking
- 5 failed login attempts → 30-minute lock
- Automatic reset on successful login
- Lock status checked before authentication

---

## Usage Examples

### 1. Admin Login Flow
```bash
# Step 1: Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# Step 2: Use token for authenticated requests
curl http://localhost:3000/api/admin/data/dashboard/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Create First Super Admin (Database)
```javascript
// Use MongoDB shell or a script
const bcrypt = require('bcrypt');
const Admin = require('./src/models/admin.model').Admin;

const hashedPassword = await bcrypt.hash('superSecurePassword', 10);

await Admin.create({
  name: 'Super Admin',
  email: 'superadmin@example.com',
  password: hashedPassword,
  role: 'super_admin',
  permissions: {
    canManageFraud: true,
    canManageReports: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canDeleteData: true,
    canManageAdmins: true,
  },
  status: 'active'
});
```

### 3. Check Admin Profile
```bash
curl http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer <token>"
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized - No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "required": "canManageUsers"
}
```

### 404 Not Found
```json
{
  "error": "Admin not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Account locked due to multiple failed login attempts",
  "lockDuration": "30 minutes"
}
```

---

## Best Practices

### For Super Admins
1. **Initial Setup**: Create your super admin account via database
2. **Delegate Wisely**: Create admins/moderators with minimal required permissions
3. **Regular Audits**: Review admin activity logs monthly
4. **Secure Credentials**: Use strong passwords and rotate them quarterly

### For Development
1. **Environment Variables**: Store JWT_SECRET securely
2. **HTTPS Only**: Use SSL/TLS in production
3. **Token Expiration**: 8-hour expiry for better security
4. **Rate Limiting**: Implement on all admin endpoints
5. **Audit Logs**: Log all admin actions for accountability

### For Integration
1. Store admin token securely (localStorage with encryption or httpOnly cookies)
2. Include token in all requests: `Authorization: Bearer <token>`
3. Handle 401 errors by redirecting to login
4. Refresh tokens before expiration
5. Clear tokens on logout

---

## Testing

### Test Admin Login
```bash
# Valid credentials
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Invalid credentials (should increment login attempts)
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"wrongpassword"}'
```

### Test Permission Checks
```bash
# Should succeed (admin with canViewAnalytics)
curl http://localhost:3000/api/admin/data/dashboard/stats \
  -H "Authorization: Bearer <admin-token>"

# Should fail (moderator without canManageUsers)
curl -X PATCH http://localhost:3000/api/admin/data/users/123/status \
  -H "Authorization: Bearer <moderator-token>" \
  -H "Content-Type: application/json" \
  -d '{"status": false}'
```

---

## Troubleshooting

### Issue: "Invalid token" error
**Solution**: Token may have expired (8-hour lifespan). Login again to get a new token.

### Issue: "Insufficient permissions"
**Solution**: Your admin role doesn't have the required permission. Contact a super admin to update your permissions.

### Issue: "Account locked"
**Solution**: Wait 30 minutes or contact a super admin to manually reset your account.

### Issue: Cannot create first admin
**Solution**: Manually create a super admin directly in the database using the provided script.

---

## Integration with Fraud & Report Systems

Admin routes work seamlessly with existing fraud and report endpoints:

```bash
# View fraud cases (requires canManageFraud permission)
curl http://localhost:3000/api/fraud/cases \
  -H "Authorization: Bearer <admin-token>"

# Review reports (requires canManageReports permission)
curl -X POST http://localhost:3000/api/reports/123/review \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "action": "user_warned",
    "notes": "Verified and resolved"
  }'
```

---

## Future Enhancements

1. **Two-Factor Authentication (2FA)**: Add OTP verification for admin logins
2. **Activity Logs**: Track all admin actions with timestamps
3. **Email Notifications**: Alert on suspicious admin activity
4. **IP Whitelisting**: Restrict admin access to specific IPs
5. **Advanced Analytics**: Real-time dashboards with charts
6. **Bulk Actions**: Manage multiple users/orders at once
7. **Export Data**: Download reports in CSV/PDF format

# Email API Documentation

## Base URL
```
http://localhost:3000/api/email
```

---

## Authentication
All email endpoints require authentication via JWT token in cookies (except health check).

---

## Endpoints

### 1. Send Single Email
**Endpoint:** `POST /api/email/send`  
**Authentication:** Required  
**Description:** Send a single email to one recipient

**Request Body:**
```json
{
  "email": "recipient@example.com",
  "message": "<h1>Hello World</h1><p>This is your email content with HTML support.</p>"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "email": "recipient@example.com",
    "sentAt": "2025-11-28T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:3000/api/email/send" \
  -H "Content-Type: application/json" \
  -b "jwt=YOUR_JWT_TOKEN" \
  -d '{
    "email": "test@example.com",
    "message": "<h1>Test Email</h1><p>This is a test message.</p>"
  }'
```

---

### 2. Send Bulk Email
**Endpoint:** `POST /api/email/send-bulk`  
**Authentication:** Required  
**Description:** Send emails to multiple recipients (max 50)

**Request Body:**
```json
{
  "emails": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "message": "<h1>Bulk Email</h1><p>This message goes to all recipients.</p>"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Bulk email completed. 3 sent, 0 failed",
  "data": {
    "successCount": 3,
    "failureCount": 0,
    "totalEmails": 3,
    "results": [
      {
        "email": "user1@example.com",
        "status": "sent",
        "sentAt": "2025-11-28T10:30:00Z"
      },
      {
        "email": "user2@example.com",
        "status": "sent",
        "sentAt": "2025-11-28T10:30:01Z"
      },
      {
        "email": "user3@example.com",
        "status": "sent",
        "sentAt": "2025-11-28T10:30:02Z"
      }
    ],
    "errors": [],
    "sentAt": "2025-11-28T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:3000/api/email/send-bulk" \
  -H "Content-Type: application/json" \
  -b "jwt=YOUR_JWT_TOKEN" \
  -d '{
    "emails": ["test1@example.com", "test2@example.com"],
    "message": "<h1>Bulk Email Test</h1><p>Message for everyone!</p>"
  }'
```

---

### 3. Send Template Email
**Endpoint:** `POST /api/email/send-template`  
**Authentication:** Required  
**Description:** Send predefined template emails with dynamic data

**Available Templates:**
- `welcome` - Welcome new users
- `order_confirmation` - Confirm order creation
- `order_delivered` - Notify order delivery
- `payment_received` - Notify payment received
- `custom` - Custom content template

#### Welcome Template
**Request Body:**
```json
{
  "email": "newuser@example.com",
  "template": "welcome",
  "data": {
    "name": "John Doe"
  }
}
```

#### Order Confirmation Template
**Request Body:**
```json
{
  "email": "buyer@example.com",
  "template": "order_confirmation",
  "data": {
    "buyerName": "Jane Smith",
    "orderId": "ORD-123456",
    "gigTitle": "Professional Website Development",
    "amount": "500",
    "expectedDelivery": "7 days"
  }
}
```

#### Order Delivered Template
**Request Body:**
```json
{
  "email": "buyer@example.com",
  "template": "order_delivered",
  "data": {
    "buyerName": "Jane Smith",
    "orderId": "ORD-123456",
    "sellerName": "John Developer",
    "deliveredAt": "2025-11-28T15:30:00Z"
  }
}
```

#### Payment Received Template
**Request Body:**
```json
{
  "email": "seller@example.com",
  "template": "payment_received",
  "data": {
    "sellerName": "John Developer",
    "amount": "500",
    "buyerName": "Jane Smith",
    "orderId": "ORD-123456"
  }
}
```

#### Custom Template
**Request Body:**
```json
{
  "email": "user@example.com",
  "template": "custom",
  "data": {
    "message": "<h2>Custom Content</h2><p>Your custom HTML message here.</p>"
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Template email 'welcome' sent successfully",
  "data": {
    "email": "newuser@example.com",
    "template": "welcome",
    "sentAt": "2025-11-28T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:3000/api/email/send-template" \
  -H "Content-Type: application/json" \
  -b "jwt=YOUR_JWT_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "template": "welcome",
    "data": {
      "name": "John Doe"
    }
  }'
```

---

### 4. Get Available Templates
**Endpoint:** `GET /api/email/templates`  
**Authentication:** Required  
**Description:** Get list of available email templates with examples

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Available email templates",
  "data": {
    "welcome": {
      "name": "Welcome Email",
      "description": "Welcome new users to the platform",
      "requiredData": ["name"],
      "example": {
        "template": "welcome",
        "data": { "name": "John Doe" }
      }
    },
    "order_confirmation": {
      "name": "Order Confirmation",
      "description": "Confirm order creation",
      "requiredData": ["buyerName", "orderId", "gigTitle", "amount", "expectedDelivery"],
      "example": {
        "template": "order_confirmation",
        "data": {
          "buyerName": "Jane Smith",
          "orderId": "ORD-123",
          "gigTitle": "Website Development",
          "amount": "500",
          "expectedDelivery": "7 days"
        }
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/email/templates" \
  -b "jwt=YOUR_JWT_TOKEN"
```

---

### 5. Health Check
**Endpoint:** `GET /api/email/health`  
**Authentication:** Not Required  
**Description:** Check if email service is running

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Email service is running",
  "timestamp": "2025-11-28T10:30:00Z",
  "service": "Email Controller"
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/email/health"
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Email and message are required"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized - No Token Provided"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to send email",
  "error": "Connection timeout"
}
```

---

## Usage Examples

### Basic Email Sending
```javascript
// Send simple email
const response = await fetch('http://localhost:3000/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    email: 'user@example.com',
    message: '<h1>Hello!</h1><p>Your message content.</p>'
  })
});

const result = await response.json();
console.log(result);
```

### Send Welcome Email
```javascript
// Send welcome email to new user
const response = await fetch('http://localhost:3000/api/email/send-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'newuser@example.com',
    template: 'welcome',
    data: {
      name: 'John Doe'
    }
  })
});
```

### Integration with Order System
```javascript
// Send order confirmation
async function sendOrderConfirmation(order) {
  const response = await fetch('http://localhost:3000/api/email/send-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email: order.buyer.email,
      template: 'order_confirmation',
      data: {
        buyerName: order.buyer.name,
        orderId: order._id,
        gigTitle: order.gig.title,
        amount: order.price,
        expectedDelivery: order.expectedDelivery
      }
    })
  });

  return response.json();
}
```

---

## Notes

1. **HTML Support:** All email content supports HTML formatting
2. **Rate Limiting:** Bulk emails are limited to 50 recipients per request
3. **Authentication:** JWT token must be present in cookies
4. **Email Validation:** All email addresses are validated before sending
5. **Error Handling:** Failed emails in bulk operations are reported individually
6. **Templates:** Use predefined templates for consistent email formatting
7. **Environment Setup:** Ensure EMAIL_USER, CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN are configured in .env

---

## Quick Test

Test the email service:

```bash
# 1. Health check
curl "http://localhost:3000/api/email/health"

# 2. Get templates (requires auth)
curl -X GET "http://localhost:3000/api/email/templates" -b "jwt=YOUR_TOKEN"

# 3. Send test email (requires auth)
curl -X POST "http://localhost:3000/api/email/send" \
  -H "Content-Type: application/json" \
  -b "jwt=YOUR_TOKEN" \
  -d '{"email":"test@example.com","message":"<h1>Test</h1><p>Hello World!</p>"}'
```
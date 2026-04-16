# Simple Gig & Order API Documentation

## Base URL
```
http://localhost:3000/api
```

---

## Table of Contents
1. [Simple Gig APIs](#simple-gig-apis)
2. [Simple Order APIs](#simple-order-apis)
3. [Authentication & Error Handling](#authentication--error-handling)

---

## Simple Gig APIs

### 1. Get All Simple Gigs
**Endpoint:** `GET /simple-gigs`

**Description:** Retrieve all active simple gigs with filtering, searching, and pagination

**Query Parameters:**
- `category` (string, optional): Filter by category
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter
- `search` (string, optional): Search in title, description, and tags
- `sortBy` (string, optional): Sort field (default: 'createdAt')
- `sortOrder` (string, optional): 'asc' or 'desc' (default: 'desc')
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 12, max: 50)

**Example Request:**
```
GET /api/simple-gigs?category=Programming & Tech&minPrice=10&maxPrice=100&search=website&page=1&limit=10
```

**Response (Success - 200):**
```json
{
  \"gigs\": [
    {
      \"_id\": \"507f1f77bcf86cd799439011\",
      \"title\": \"I will create a responsive website\",
      \"description\": \"Professional website development...\",
      \"category\": \"Programming & Tech\",
      \"tags\": [\"website\", \"responsive\", \"html\", \"css\"],
      \"price\": 50,
      \"deliveryTime\": 7,
      \"revisions\": 2,
      \"features\": [\"Responsive design\", \"SEO optimized\"],
      \"images\": [\"https://cloudinary.com/image1.jpg\"],
      \"seller\": {
        \"_id\": \"507f1f77bcf86cd799439012\",
        \"name\": \"John Doe\",
        \"pfp\": \"https://cloudinary.com/profile.jpg\"
      },
      \"rating\": {
        \"average\": 4.8,
        \"count\": 25
      },
      \"totalOrders\": 50,
      \"isActive\": true,
      \"createdAt\": \"2025-11-14T10:30:00Z\",
      \"updatedAt\": \"2025-11-14T10:30:00Z\"
    }
  ],
  \"pagination\": {
    \"currentPage\": 1,
    \"totalPages\": 5,
    \"totalCount\": 50,
    \"hasNext\": true,
    \"hasPrev\": false
  }
}
```

---

### 2. Get Simple Gig by ID
**Endpoint:** `GET /simple-gigs/:gigId`

**Description:** Get detailed information about a specific simple gig

**Response (Success - 200):**
```json
{
  \"gig\": {
    \"_id\": \"507f1f77bcf86cd799439011\",
    \"title\": \"I will create a responsive website\",
    \"description\": \"Professional website development with modern technologies...\",
    \"category\": \"Programming & Tech\",
    \"tags\": [\"website\", \"responsive\", \"html\", \"css\"],
    \"price\": 50,
    \"deliveryTime\": 7,
    \"revisions\": 2,
    \"features\": [\"Responsive design\", \"SEO optimized\", \"Mobile friendly\"],
    \"images\": [\"https://cloudinary.com/image1.jpg\", \"https://cloudinary.com/image2.jpg\"],
    \"seller\": {
      \"_id\": \"507f1f77bcf86cd799439012\",
      \"name\": \"John Doe\",
      \"email\": \"john@example.com\",
      \"pfp\": \"https://cloudinary.com/profile.jpg\",
      \"totalOrders\": 100,
      \"lastOnline\": \"2025-11-14T10:30:00Z\"
    },
    \"rating\": {
      \"average\": 4.8,
      \"count\": 25
    },
    \"totalOrders\": 50,
    \"isActive\": true,
    \"createdAt\": \"2025-11-14T10:30:00Z\",
    \"updatedAt\": \"2025-11-14T10:30:00Z\"
  }
}
```

---

### 3. Get Simple Gigs by Seller
**Endpoint:** `GET /simple-gigs/seller/:sellerId`

**Description:** Get all simple gigs created by a specific seller

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 10, max: 20)
- `status` (string, optional): 'active' or 'inactive' to filter by status

**Response (Success - 200):**
```json
{
  \"gigs\": [...],
  \"pagination\": {
    \"currentPage\": 1,
    \"totalPages\": 3,
    \"totalCount\": 25
  }
}
```

---

### 4. Create Simple Gig
**Endpoint:** `POST /simple-gigs`

**Authentication:** Required (JWT token in cookie)

**Request Headers:**
```
Content-Type: multipart/form-data
Cookie: jwt=<token>
```

**Request Body:**
```json
{
  \"title\": \"I will create a responsive website\",
  \"description\": \"Professional website development with modern technologies...\",
  \"category\": \"Programming & Tech\",
  \"tags\": [\"website\", \"responsive\", \"html\", \"css\"],
  \"price\": 50,
  \"deliveryTime\": 7,
  \"revisions\": 2,
  \"features\": [\"Responsive design\", \"SEO optimized\"],
  \"images\": [\"https://cloudinary.com/image1.jpg\"]
}
```

**Response (Success - 201):**
```json
{
  \"message\": \"Simple gig created successfully\",
  \"gig\": {
    \"_id\": \"507f1f77bcf86cd799439011\",
    \"title\": \"I will create a responsive website\",
    \"seller\": {
      \"_id\": \"507f1f77bcf86cd799439012\",
      \"name\": \"John Doe\"
    },
    ...
  }
}
```

---

### 5. Update Simple Gig
**Endpoint:** `PUT /simple-gigs/:gigId`

**Authentication:** Required (must be gig owner)

**Request Body:** (Same as create, all fields optional)
```json
{
  \"title\": \"Updated title\",
  \"price\": 75,
  \"deliveryTime\": 5
}
```

**Response (Success - 200):**
```json
{
  \"message\": \"Gig updated successfully\",
  \"gig\": {...}
}
```

---

### 6. Delete Simple Gig
**Endpoint:** `DELETE /simple-gigs/:gigId`

**Authentication:** Required (must be gig owner)

**Response (Success - 200):**
```json
{
  \"message\": \"Gig deleted successfully\"
}
```

---

### 7. Toggle Gig Status
**Endpoint:** `PATCH /simple-gigs/:gigId/toggle-status`

**Authentication:** Required (must be gig owner)

**Description:** Toggle between active and inactive status

**Response (Success - 200):**
```json
{
  \"message\": \"Gig activated successfully\",
  \"isActive\": true
}
```

---

### 8. Get Categories
**Endpoint:** `GET /simple-gigs/categories`

**Description:** Get list of available gig categories

**Response (Success - 200):**
```json
{
  \"categories\": [
    \"Graphics & Design\",
    \"Digital Marketing\",
    \"Writing & Translation\",
    \"Video & Animation\",
    \"Music & Audio\",
    \"Programming & Tech\",
    \"Data\",
    \"Business\",
    \"Lifestyle\"
  ]
}
```

---

## Simple Order APIs

### 1. Create Simple Order
**Endpoint:** `POST /simple-orders`

**Authentication:** Required (JWT token in cookie)

**Description:** Create a new order for a simple gig

**Request Body:**
```json
{
  \"gigId\": \"507f1f77bcf86cd799439011\",
  \"requirements\": [
    {
      \"question\": \"What is your website theme?\",
      \"answer\": \"Modern and minimalist\"
    },
    {
      \"question\": \"Do you have a logo?\",
      \"answer\": \"Yes, I will provide it\"
    },
    {
      \"question\": \"Specific Confirmation\",
      \"answer\": \"Yes, I will provide it\"
    }
  ]
}
```

**Response (Success - 201):**
```json
{
  \"message\": \"Order created successfully\",
  \"order\": {
    \"_id\": \"507f1f77bcf86cd799439020\",
    \"gig\": {
      \"_id\": \"507f1f77bcf86cd799439011\",
      \"title\": \"I will create a responsive website\",
      \"images\": [\"https://cloudinary.com/image1.jpg\"],
      \"price\": 50
    },
    \"buyer\": {
      \"_id\": \"507f1f77bcf86cd799439013\",
      \"name\": \"Jane Smith\",
      \"email\": \"jane@example.com\",
      \"pfp\": \"https://cloudinary.com/jane.jpg\"
    },
    \"seller\": {
      \"_id\": \"507f1f77bcf86cd799439012\",
      \"name\": \"John Doe\",
      \"email\": \"john@example.com\",
      \"pfp\": \"https://cloudinary.com/john.jpg\"
    },
    \"price\": 50,
    \"deliveryTime\": 7,
    \"revisions\": 2,
    \"status\": \"pending\",
    \"requirements\": [...],
    \"payment\": {
      \"amount\": 50,
      \"currency\": \"USD\",
      \"status\": \"pending\"
    },
    \"timeline\": {
      \"ordered\": \"2025-11-14T10:30:00Z\"
    },
    \"expectedDelivery\": \"2025-11-21T10:30:00Z\",
    \"createdAt\": \"2025-11-14T10:30:00Z\"
  }
}
```

---

### 2. Get Buyer Orders
**Endpoint:** `GET /simple-orders/buyer`

**Authentication:** Required

**Description:** Get all orders where the current user is the buyer

**Query Parameters:**
- `status` (string, optional): Filter by order status
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 10, max: 20)

**Response (Success - 200):**
```json
{
  \"orders\": [
    {
      \"_id\": \"507f1f77bcf86cd799439020\",
      \"gig\": {
        \"title\": \"I will create a responsive website\",
        \"images\": [\"https://cloudinary.com/image1.jpg\"],
        \"price\": 50,
        \"category\": \"Programming & Tech\"
      },
      \"seller\": {
        \"name\": \"John Doe\",
        \"pfp\": \"https://cloudinary.com/john.jpg\"
      },
      \"price\": 50,
      \"status\": \"active\",
      \"expectedDelivery\": \"2025-11-21T10:30:00Z\",
      \"createdAt\": \"2025-11-14T10:30:00Z\"
    }
  ],
  \"pagination\": {
    \"currentPage\": 1,
    \"totalPages\": 2,
    \"totalCount\": 15
  }
}
```

---

### 3. Get Seller Orders
**Endpoint:** `GET /simple-orders/seller`

**Authentication:** Required

**Description:** Get all orders where the current user is the seller

**Query Parameters:** (Same as buyer orders)

**Response (Success - 200):**
```json
{
  \"orders\": [
    {
      \"_id\": \"507f1f77bcf86cd799439020\",
      \"gig\": {
        \"title\": \"I will create a responsive website\",
        \"images\": [\"https://cloudinary.com/image1.jpg\"],
        \"price\": 50,
        \"category\": \"Programming & Tech\"
      },
      \"buyer\": {
        \"name\": \"Jane Smith\",
        \"pfp\": \"https://cloudinary.com/jane.jpg\"
      },
      \"price\": 50,
      \"status\": \"active\",
      \"expectedDelivery\": \"2025-11-21T10:30:00Z\",
      \"createdAt\": \"2025-11-14T10:30:00Z\"
    }
  ],
  \"pagination\": {...}
}
```

---

### Added by Me
### 4. Get Orders where sellerId and buyerId both exist
**Endpoint:** `GET /simpleorders/byusers?user1Id=seller123&user2Id=buyer123`

**Authentication:** Required

**Description:** Get all orders where this specific seller AND buyer exist

**Response (Success - 200):**
```json
{
  \"orders\": [
    {
      \"_id\": \"507f1f77bcf86cd799439020\",
      \"gig\": {
        \"title\": \"I will create a responsive website\",
        \"images\": [\"https://cloudinary.com/image1.jpg\"],
        \"price\": 50,
        \"category\": \"Programming & Tech\"
      },
      \"buyer\": {
        \"name\": \"Jane Smith\",
        \"pfp\": \"https://cloudinary.com/jane.jpg\"
      },
      \"price\": 50,
      \"status\": \"active\",
      \"expectedDelivery\": \"2025-11-21T10:30:00Z\",
      \"createdAt\": \"2025-11-14T10:30:00Z\"
    }
  ],
  \"pagination\": {...}
}
```

### 4. Get Order by ID
**Endpoint:** `GET /simple-orders/:orderId`

**Authentication:** Required (must be buyer or seller)

**Description:** Get detailed information about a specific order

**Response (Success - 200):**
```json
{
  \"order\": {
    \"_id\": \"507f1f77bcf86cd799439020\",
    \"gig\": {
      \"_id\": \"507f1f77bcf86cd799439011\",
      \"title\": \"I will create a responsive website\",
      \"images\": [\"https://cloudinary.com/image1.jpg\"],
      \"price\": 50,
      \"category\": \"Programming & Tech\"
    },
    \"buyer\": {
      \"_id\": \"507f1f77bcf86cd799439013\",
      \"name\": \"Jane Smith\",
      \"email\": \"jane@example.com\",
      \"pfp\": \"https://cloudinary.com/jane.jpg\"
    },
    \"seller\": {
      \"_id\": \"507f1f77bcf86cd799439012\",
      \"name\": \"John Doe\",
      \"email\": \"john@example.com\",
      \"pfp\": \"https://cloudinary.com/john.jpg\"
    },
    \"price\": 50,
    \"deliveryTime\": 7,
    \"revisions\": 2,
    \"status\": \"active\",
    \"requirements\": [...],
    \"deliverables\": [],
    \"revisionRequests\": [],
    \"payment\": {
      \"amount\": 50,
      \"currency\": \"USD\",
      \"status\": \"paid\",
      \"paidAt\": \"2025-11-14T10:35:00Z\"
    },
    \"timeline\": {
      \"ordered\": \"2025-11-14T10:30:00Z\",
      \"started\": \"2025-11-14T10:35:00Z\"
    },
    \"expectedDelivery\": \"2025-11-21T10:30:00Z\",
    \"review\": null,
    \"createdAt\": \"2025-11-14T10:30:00Z\",
    \"updatedAt\": \"2025-11-14T10:35:00Z\"
  }
}
```

---

### 5. Update Order Status
**Endpoint:** `PATCH /simple-orders/:orderId/status`

**Authentication:** Required (must be buyer or seller)

**Description:** Update order status following valid transitions

**Status Transitions:**
- `pending` → `active`, `cancelled`
- `active` → `delivered`, `cancelled`
- `delivered` → `completed`, `in_revision`
- `in_revision` → `delivered`
- `completed` → (final state)
- `cancelled` → (final state)

**Request Body:**
```json
{
  \"status\": \"delivered\"
}
```

**Response (Success - 200):**
```json
{
  \"message\": \"Order status updated to delivered\",
  \"order\": {...}
}
```

---

### 6. Add Deliverable
**Endpoint:** `POST /simple-orders/:orderId/deliverables`

**Authentication:** Required (must be seller)

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
```json
{
  \"description\": \"Here is your completed website with all requested features\",
  \"files\": [\"https://cloudinary.com/file1.zip\", \"https://cloudinary.com/file2.pdf\"]
}
```

**Response (Success - 200):**
```json
{
  \"message\": \"Deliverable added successfully\",
  \"deliverable\": {
    \"files\": [\"https://cloudinary.com/file1.zip\", \"https://cloudinary.com/file2.pdf\"],
    \"description\": \"Here is your completed website with all requested features\",
    \"deliveredAt\": \"2025-11-21T10:30:00Z\"
  }
}
```

---

### 7. Request Revision
**Endpoint:** `POST /simple-orders/:orderId/revisions`

**Authentication:** Required (must be buyer)

**Description:** Request revision on delivered work (if revisions are available)

**Request Body:**
```json
{
  \"description\": \"Please change the color scheme to blue and add a contact form\"
}
```

**Response (Success - 200):**
```json
{
  \"message\": \"Revision requested successfully\",
  \"revisionRequest\": {
    \"description\": \"Please change the color scheme to blue and add a contact form\",
    \"requestedAt\": \"2025-11-21T11:00:00Z\",
    \"status\": \"pending\"
  }
}
```

---

### 8. Add Review
**Endpoint:** `POST /simple-orders/:orderId/review`

**Authentication:** Required (must be buyer)

**Description:** Add review and rating after order completion

**Request Body:**
```json
{
  \"rating\": 5,
  \"comment\": \"Excellent work! Very professional and delivered on time.\"
}
```

**Response (Success - 200):**
```json
{
  \"message\": \"Review added successfully\",
  \"review\": {
    \"rating\": 5,
    \"comment\": \"Excellent work! Very professional and delivered on time.\",
    \"reviewedAt\": \"2025-11-21T15:00:00Z\"
  }
}
```

---

### 9. Cancel Order
**Endpoint:** `DELETE /simple-orders/:orderId/cancel`

**Authentication:** Required (must be buyer or seller)

**Description:** Cancel pending or active orders

**Request Body:**
```json
{
  \"reason\": \"Changed requirements, no longer needed\"
}
```

**Response (Success - 200):**
```json
{
  \"message\": \"Order cancelled successfully\",
  \"order\": {...}
}
```

---

#### 10. Get Simple Order Messages
**GET** `/api/simpleorders/messages?me=user123&orderId=order789`

**Response:**
```json
{
  "messages": [
    {
      "_id": "messageId1",
      "from": "user123",
      "to": "user456",
      "content": "Hello!",
      "createdAt": "2025-09-18T20:00:00.000Z",
      "read": false
    }
  ]
}
```

---

## Authentication & Error Handling

### Authentication
All protected endpoints require a valid JWT token stored in HTTP-only cookie named `jwt`.

**Authentication Header:**
```
Cookie: jwt=<your-jwt-token>
```

### Common Error Codes
- `400 Bad Request`: Missing or invalid request data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Access denied (not authorized for this action)
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

### Error Response Format
```json
{
  \"message\": \"Error description\"
}
```

---

## Key Differences from Complex Models

### Simple Gig vs. Gig
- **Single Package**: Only one pricing tier instead of Basic/Standard/Premium
- **Direct Pricing**: Simple `price` field instead of package object
- **Streamlined Features**: Single feature list instead of per-package features
- **No FAQs**: Removed FAQ section for simplicity
- **No Requirements**: Removed seller requirements section

### Simple Order vs. Order
- **No Package Selection**: Orders directly reference gig pricing
- **No Extras**: Removed additional services/extras functionality  
- **Simplified Payment**: Single amount payment without extras calculation
- **No Conversation**: Messages handled separately via existing message system
- **Automatic Pricing**: Price copied directly from gig without calculations

---

## Example Workflows

### Simple Gig Creation Workflow
```
1. POST /simple-gigs (create gig with single package)
   → Gig created with direct pricing
   → Seller sets: title, description, price, delivery time, revisions
   
2. Gig becomes available in marketplace
   → Buyers can browse and search
   → Single clear pricing displayed
```

### Simple Order Workflow
```
1. POST /simple-orders (buyer creates order)
   → Price automatically copied from gig
   → Order created in 'pending' status
   
2. PATCH /simple-orders/:id/status → 'active' (seller accepts)
   → Work begins, timeline updated
   
3. POST /simple-orders/:id/deliverables (seller delivers)
   → Files uploaded, order status can move to 'delivered'
   
4. PATCH /simple-orders/:id/status → 'completed' (buyer accepts)
   → Order completed
   
5. POST /simple-orders/:id/review (buyer reviews)
   → Review added, gig rating updated
```

---

## Version Information
- API Version: 1.0.0
- Simple Models Version: 1.0.0
- Last Updated: November 14, 2025
- Compatibility: Node.js 18+, MongoDB 5+
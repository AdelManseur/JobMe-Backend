# REST API Documentation

## Base URL
```
http://localhost:3000/api
```

---

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Chat APIs](#chat-apis)
3. [AI Chat APIs](#ai-chat-apis)
4. [Upload APIs](#upload-apis)
5. [Verification APIs](#verification-apis)

---

## Authentication APIs

### 1. Sign In (Register New User)
**Endpoint:** `POST /user/signin`

**Description:** Register a new user with email verification via OTP

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
```json
{
  "metadata": "{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"phone\":\"1234567890\",\"bday\":\"1990-01-15\",\"password\":\"SecurePass123\",\"address\":{\"street\":\"123 Main St\",\"city\":\"New York\",\"postalCode\":\"10001\",\"country\":\"USA\"}}",
  "pfp": "<image_file>"
}
```

**Metadata Fields:**
- `name` (string, required): User's full name
- `email` (string, required): User's email address
- `phone` (string, required): User's phone number
- `bday` (string, required): Date of birth
- `password` (string, required): Must be at least 8 characters
- `address` (object, required): User's address with street, city, postalCode, country
- `pfp` (file, optional): Profile picture image

**Response (Success - 200):**
```json
{
  "message": "OTP verification required",
  "email": "john@example.com",
  "redirect": "/verify-otp"
}
```

**Response (Error - 400):**
```json
{
  "message": "Email already exists"
}
```

**Response (Error - 400):**
```json
{
  "message": "Password must be at least 8 characters"
}
```

---

### 2. Login
**Endpoint:** `POST /user/login`

**Description:** Log in an existing user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (Success - 200):**
```json
{
  "message": "User logged in successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "address": {...},
    "pfp": "https://cloudinary.com/...",
    "lastOnline": "2025-11-14T10:30:00Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "message": "User not found"
}
```

---

### 3. Logout
**Endpoint:** `POST /user/logout`

**Description:** Log out the current user and clear JWT token

**Request Headers:**
```
Cookie: jwt=<token>
```

**Response (Success - 200):**
```json
{
  "message": "User logged out successfully"
}
```

---

### 4. Update Profile
**Endpoint:** `PUT /user/update-profile`

**Description:** Update user profile information (password, address, fields of interest, or profile picture)

**Authentication:** Required (JWT token in cookie)

**Request Headers:**
```
Content-Type: multipart/form-data
Cookie: jwt=<token>
```

**Request Body:**
```json
{
  "metadata": "{\"changePass\":true,\"npassword\":\"NewPassword123\",\"changeAdd\":false,\"changeFOI\":false}",
  "pfp": "<image_file>"
}
```

**Metadata Fields:**
- `changePass` (boolean): Set to true if changing password
- `npassword` (string): New password (required if changePass is true, min 8 chars)
- `changeAdd` (boolean): Set to true if changing address
- `naddress` (object): New address object (required if changeAdd is true)
- `changeFOI` (boolean): Set to true if changing fields of interest
- `nfieldsOfInterest` (array): Array of interest fields (required if changeFOI is true)

**Response (Success - 200):**
```json
{
  "message": "Profile updated successfully"
}
```

**Response (Error - 401):**
```json
{
  "message": "Unauthorized"
}
```

---

### Added by me
### 1. Get simple user details
**Endpoint:** `GET /user/get-details?userId=user123`

**Description:** Get simple user details like name and pfp

**Request Body:**
```json
{
  "userId": "userId"
}
```

**Response (Success - 201):**
```json
{
  "userId": "userId",
  "name": "name",
  "email": "email",
  "phone": "phone",
  "pfp": "url",
}
```

## Chat APIs

### 1. Send Message
**Endpoint:** `POST /chat/message`

**Description:** Send a message from one user to another

**Request Body:**
```json
{
  "from": "507f1f77bcf86cd799439011",
  "to": "507f1f77bcf86cd799439012",
  "content": "Hello, how are you?"
}
```

**Response (Success - 201):**
```json
{
  "message": "Message sent successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "from": "507f1f77bcf86cd799439011",
    "to": "507f1f77bcf86cd799439012",
    "content": "Hello, how are you?",
    "createdAt": "2025-11-14T10:30:00Z",
    "read": false
  }
}
```

**WebSocket Event Emitted:**
- Event: `newMessage`
- Sent to receiver if they are connected
- Payload: Message object (same as response data)

---

### 2. Get Messages
**Endpoint:** `GET /chat/messages`

**Description:** Retrieve all messages between two users

**Query Parameters:**
```
?userId1=507f1f77bcf86cd799439011&userId2=507f1f77bcf86cd799439012
```

**Response (Success - 200):**
```json
{
  "messages": [
    {
      "_id": "607f1f77bcf86cd799439013",
      "from": "507f1f77bcf86cd799439011",
      "to": "507f1f77bcf86cd799439012",
      "content": "Hello",
      "createdAt": "2025-11-14T10:30:00Z",
      "read": false
    },
    {
      "_id": "607f1f77bcf86cd799439014",
      "from": "507f1f77bcf86cd799439012",
      "to": "507f1f77bcf86cd799439011",
      "content": "Hi there!",
      "createdAt": "2025-11-14T10:31:00Z",
      "read": true
    }
  ]
}
```

---

## AI Chat APIs

### 1. Send Message to AI
**Endpoint:** `POST /chatbot/message`

**Description:** Send a message to the AI chatbot and get a response

**Request Body:**
```json
{
  "from": "507f1f77bcf86cd799439011",
  "to": "507f1f77bcf86cd799439012",
  "content": "What is the capital of France?"
}
```

**Response (Success - 201):**
```json
{
  "message": "Message sent successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "from": "507f1f77bcf86cd799439011",
    "to": "507f1f77bcf86cd799439012",
    "content": "What is the capital of France?",
    "aireply": "The capital of France is *Paris*. It is known as the City of Light and is famous for its iconic landmarks like the Eiffel Tower.",
    "createdAt": "2025-11-14T10:30:00Z"
  }
}
```

**Notes:**
- The AI response uses `*text*` for emphasis (formatted as bold in frontend)
- AI response is saved to database and sent via WebSocket to user

**WebSocket Event Emitted:**
- Event: `newMessage`
- Payload: Contains the AI response

---

### 2. Get AI Chat History
**Endpoint:** `GET /chatbot/message`

**Description:** Retrieve all AI chat messages for a user

**Query Parameters:**
```
?userId1=507f1f77bcf86cd799439011&userId2=507f1f77bcf86cd799439012
```

**Response (Success - 200):**
```json
{
  "messages": [
    {
      "_id": "607f1f77bcf86cd799439013",
      "from": "507f1f77bcf86cd799439011",
      "to": "507f1f77bcf86cd799439012",
      "content": "What is the capital of France?",
      "createdAt": "2025-11-14T10:30:00Z"
    },
    {
      "_id": "607f1f77bcf86cd799439014",
      "from": "507f1f77bcf86cd799439012",
      "to": "507f1f77bcf86cd799439011",
      "content": "The capital of France is *Paris*.",
      "createdAt": "2025-11-14T10:30:05Z"
    }
  ]
}
```

---

## Upload APIs

### Upload Image
**Endpoint:** `POST /upload`

**Description:** Upload an image to Cloudinary

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
```
image: <image_file>
folder: "uploads" (optional, defaults to "uploads")
```

**Supported Formats:**
- PNG
- JPG/JPEG
- WebP
- GIF
- HEIC
- HEIF
- SVG

**Constraints:**
- Max file size: 10MB

**Response (Success - 201):**
```json
{
  "url": "https://res.cloudinary.com/.../uploads/xyz123.png"
}
```

**Response (Error - 400):**
```json
{
  "error": "No file provided"
}
```

**Response (Error - 413):**
```json
{
  "error": "Only image files are allowed"
}
```

---

## Verification APIs

### Verify OTP and Create Account
**Endpoint:** `POST /verification/verify-otp`

**Description:** Verify the OTP sent to user's email and complete account registration

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Session Requirement:**
- Must have `pendingRegistration` session data from Sign In endpoint

**Response (Success - 201):**
```json
{
  "message": "User registered successfully"
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

**Response (Error - 400):**
```json
{
  "message": "Registration session expired"
}
```

**Flow:**
1. User calls Sign In endpoint
2. OTP is sent to their email
3. User receives OTP and calls this endpoint with the code
4. Upon successful verification, user account is created
5. JWT token is generated and user is logged in

---

## WebSocket Events

### Connection
**Event:** `connect`
- Triggered when a user connects to the chat server
- Include userId in query: `?userId=<userId>`

### User Online
**Event:** `userOnline`
- Emitted to all connected users when a new user comes online
- Payload: `{ userId: "<userId>" }`

### User Offline
**Event:** `userOffline`
- Emitted when a user disconnects
- Payload: `{ userId: "<userId>" }`

### New Message
**Event:** `newMessage`
- Emitted to specific user when they receive a message
- Payload:
```json
{
  "_id": "<messageId>",
  "from": "<fromUserId>",
  "to": "<toUserId>",
  "content": "<messageContent>",
  "createdAt": "2025-11-14T10:30:00Z"
}
```

### User Typing
**Event:** `userTyping`
- Emitted when a user starts typing
- Payload: `{ from: "<userId>" }`

### User Stopped Typing
**Event:** `userStoppedTyping`
- Emitted when a user stops typing
- Payload: `{ from: "<userId>" }`

---

## Error Handling

### Common Error Codes
- `400 Bad Request`: Missing or invalid required fields
- `401 Unauthorized`: Authentication required or invalid token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

### Error Response Format
```json
{
  "message": "Error description",
  "error": "Error details"
}
```

---

## Authentication

### JWT Token
- Token is stored in HTTP-only cookie named `jwt`
- Automatically included in requests with cookies
- Required for protected routes (e.g., Update Profile)

### Protected Routes
Routes that require authentication:
- `PUT /user/update-profile`

---

## Notes

1. **Metadata Parsing**: For SignIn and UpdateProfile, metadata is sent as a JSON string in the request body
2. **Image Uploads**: Profile pictures are uploaded to Cloudinary
3. **OTP Verification**: OTP is valid for 5 minutes after generation
4. **WebSocket**: Real-time messaging requires active WebSocket connection
5. **Bold Text in AI Responses**: Format `*text*` is converted to bold in the frontend

---

## Example Workflows

### User Registration Workflow
```
1. POST /user/signin (with user data)
   → OTP sent to email
   → Session created with pending user data
   
2. POST /verification/verify-otp (with OTP code)
   → OTP verified
   → User account created
   → JWT token generated
   → User logged in
```

### Chat Messaging Workflow
```
1. Connect to WebSocket with userId
   
2. POST /chat/message (send message)
   → Message saved to database
   → newMessage event emitted to receiver (if online)
   → Response sent to sender
   
3. GET /chat/messages (retrieve history)
   → All messages between two users returned
```

### AI Chat Workflow
```
1. POST /chatbot/message (send message to AI)
   → User message saved
   → AI processes and generates response
   → AI response saved
   → Both messages returned in response
   → newMessage event emitted to user
```

---

## Version
API Version: 1.0.0
Last Updated: November 14, 2025

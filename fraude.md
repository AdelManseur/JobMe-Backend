# Fraud Detection System API Documentation

## Overview

The Fraud Detection System uses AI-powered analysis (Llama 4 via Groq) to automatically detect, flag, and track potentially fraudulent user behavior in real-time. The system analyzes order patterns, user behavior, account characteristics, and transaction anomalies to identify suspicious activities.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Usage Examples](#usage-examples)
- [Integration Guide](#integration-guide)
- [Admin Dashboard Guide](#admin-dashboard-guide)

---

## Features

### ✅ AI-Powered Detection
- Real-time fraud analysis using Llama 4 model
- Risk scoring (0-100) with confidence levels
- Automated pattern recognition
- Contextual evidence collection

### ✅ Comprehensive Tracking
- Detailed user behavior snapshots
- Transaction history analysis
- Account verification status
- Prior flag history

### ✅ Multi-Category Flagging
- **Behavioral**: Unusual user actions, rapid activity
- **Transactional**: Abnormal order patterns, pricing anomalies
- **Account**: New accounts, unverified users
- **Pattern**: Multiple orders, high cancellation rates
- **Payment**: Payment method issues, suspicious transactions

### ✅ Admin Review System
- Detailed case investigation interface
- Decision tracking (confirmed, dismissed, needs review)
- Action management (suspend, ban, warning, monitor)
- Case notes and collaboration

### ✅ Automated Actions
- Auto-flag high-risk users (score ≥70)
- Recommended actions based on risk level
- Immediate risk flagging for critical cases
- Related case linking

---

## Architecture

```
Order/Transaction Event
        ↓
Fraud Detection Service (AI Analysis)
        ↓
Risk Score Calculation
        ↓
Auto-Flag (if score ≥70)
        ↓
FraudUser Record Created
        ↓
Admin Review Dashboard
        ↓
Action Taken (Suspend/Ban/Monitor)
```

---

## API Endpoints

### Base URL
```
/api/fraud
```

### 1. Flag User as Fraud (AI Endpoint)

**POST** `/api/fraud/flag`

Programmatically flag a user for fraud. This endpoint is typically called by the AI fraud detection service.

#### Request Body
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "fraudScore": 85,
  "flags": [
    {
      "category": "transactional",
      "severity": "high",
      "description": "Order value 5x higher than average",
      "evidence": {
        "currentOrder": 500,
        "averageOrder": 100,
        "ratio": 5
      }
    },
    {
      "category": "behavioral",
      "severity": "critical",
      "description": "Multiple orders in 1 hour",
      "evidence": {
        "ordersCount": 5,
        "timeframe": "1 hour"
      }
    }
  ],
  "triggeringEvent": {
    "type": "order",
    "referenceId": "507f1f77bcf86cd799439022",
    "details": {
      "orderId": "507f1f77bcf86cd799439022",
      "price": 500,
      "seller": "507f1f77bcf86cd799439033"
    },
    "timestamp": "2026-01-21T10:30:00Z"
  },
  "suspiciousPatterns": [
    {
      "pattern": "Multiple orders in short timeframe",
      "occurrences": 5,
      "severity": "high",
      "examples": ["order1", "order2", "order3"]
    }
  ],
  "aiAnalysis": {
    "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "confidence": 85,
    "version": "1.0"
  },
  "riskAssessment": {
    "immediateRisk": true,
    "potentialLoss": 2500,
    "affectedUsers": 3,
    "recommendedAction": "immediate_suspension"
  }
}
```

#### Response (201 Created)
```json
{
  "message": "User flagged for fraud review",
  "fraudUser": {
    "_id": "507f1f77bcf86cd799439044",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe"
    },
    "fraudScore": 85,
    "status": "confirmed_fraud",
    "aiAnalysis": {
      "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
      "confidence": 85,
      "detectedAt": "2026-01-21T10:30:00Z",
      "analysisVersion": "1.0"
    },
    "flags": [...],
    "userSnapshot": {
      "accountAge": 5,
      "totalOrders": 10,
      "cancelledOrders": 6,
      "completedOrders": 2,
      "averageOrderValue": 100,
      "totalSpent": 1000,
      "verificationStatus": {
        "email": false,
        "phone": false,
        "identity": false
      },
      "recentActivity": {
        "ordersLast24h": 5,
        "ordersLast7days": 8
      }
    },
    "riskAssessment": {
      "immediateRisk": true,
      "potentialLoss": 2500,
      "affectedUsers": 3,
      "recommendedAction": "immediate_suspension"
    },
    "createdAt": "2026-01-21T10:30:00Z"
  }
}
```

---

### 2. Check User Fraud Status

**GET** `/api/fraud/check/:userId`

Check if a user has been flagged for fraud. Use this before processing orders or transactions.

#### Response (200 OK)
```json
{
  "isFlagged": true,
  "activeFraudCase": {
    "_id": "507f1f77bcf86cd799439044",
    "fraudScore": 85,
    "status": "confirmed_fraud",
    "riskAssessment": {
      "immediateRisk": true,
      "recommendedAction": "immediate_suspension"
    }
  },
  "highestScore": 85,
  "totalFlags": 2,
  "fraudHistory": [...],
  "recommendation": "immediate_suspension"
}
```

#### Usage Example
```javascript
// Before processing an order
const fraudCheck = await fetch(`/api/fraud/check/${userId}`);
const { isFlagged, recommendation } = await fraudCheck.json();

if (isFlagged && recommendation === 'immediate_suspension') {
  return res.status(403).json({ 
    error: 'Account suspended due to suspicious activity' 
  });
}
```

---

### 3. Get All Fraud Cases (Admin)

**GET** `/api/fraud/cases`

Retrieve all fraud cases with filtering and pagination.

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `pending_review`, `confirmed_fraud`, `false_positive`, `monitoring` |
| `minScore` | number | Minimum fraud score | `70` |
| `maxScore` | number | Maximum fraud score | `100` |
| `resolved` | boolean | Filter resolved/unresolved | `false` |
| `immediateRisk` | boolean | Filter immediate risk cases | `true` |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `20` |

#### Example Request
```
GET /api/fraud/cases?status=pending_review&minScore=70&immediateRisk=true&page=1&limit=20
```

#### Response (200 OK)
```json
{
  "fraudUsers": [
    {
      "_id": "507f1f77bcf86cd799439044",
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe",
        "createdAt": "2026-01-16T10:00:00Z"
      },
      "fraudScore": 85,
      "status": "pending_review",
      "aiAnalysis": {
        "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "confidence": 85,
        "detectedAt": "2026-01-21T10:30:00Z"
      },
      "flags": [
        {
          "category": "transactional",
          "severity": "high",
          "description": "Order value 5x higher than average",
          "detectedAt": "2026-01-21T10:30:00Z"
        }
      ],
      "riskAssessment": {
        "immediateRisk": true,
        "recommendedAction": "immediate_suspension"
      },
      "resolved": false,
      "createdAt": "2026-01-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 4. Get Fraud Case Details (Admin)

**GET** `/api/fraud/cases/:id`

Get detailed information about a specific fraud case.

#### Response (200 OK)
```json
{
  "fraudCase": {
    "_id": "507f1f77bcf86cd799439044",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "createdAt": "2026-01-16T10:00:00Z",
      "verifiedEmail": false,
      "verifiedPhone": false
    },
    "fraudScore": 85,
    "status": "pending_review",
    "aiAnalysis": {
      "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
      "confidence": 85,
      "detectedAt": "2026-01-21T10:30:00Z",
      "analysisVersion": "1.0"
    },
    "flags": [
      {
        "category": "transactional",
        "severity": "high",
        "description": "Order value 5x higher than average",
        "evidence": {
          "currentOrder": 500,
          "averageOrder": 100
        },
        "detectedAt": "2026-01-21T10:30:00Z"
      },
      {
        "category": "behavioral",
        "severity": "critical",
        "description": "Multiple orders in 1 hour",
        "evidence": {
          "ordersCount": 5
        },
        "detectedAt": "2026-01-21T10:30:00Z"
      }
    ],
    "triggeringEvent": {
      "type": "order",
      "referenceId": "507f1f77bcf86cd799439022",
      "details": {
        "orderId": "507f1f77bcf86cd799439022",
        "price": 500
      },
      "timestamp": "2026-01-21T10:30:00Z"
    },
    "userSnapshot": {
      "accountAge": 5,
      "totalOrders": 10,
      "cancelledOrders": 6,
      "completedOrders": 2,
      "averageOrderValue": 100,
      "totalSpent": 1000,
      "totalEarned": 0,
      "verificationStatus": {
        "email": false,
        "phone": false,
        "identity": false
      },
      "recentActivity": {
        "ordersLast24h": 5,
        "ordersLast7days": 8,
        "messagesLast24h": 0
      }
    },
    "suspiciousPatterns": [
      {
        "pattern": "Multiple orders in short timeframe",
        "occurrences": 5,
        "severity": "high",
        "examples": []
      }
    ],
    "review": {
      "decision": "pending",
      "notes": ""
    },
    "priorFlags": [
      {
        "flaggedAt": "2026-01-15T14:20:00Z",
        "reason": "Fraud score: 65",
        "resolved": true,
        "resolution": "false_alarm"
      }
    ],
    "riskAssessment": {
      "immediateRisk": true,
      "potentialLoss": 2500,
      "affectedUsers": 3,
      "recommendedAction": "immediate_suspension"
    },
    "resolved": false,
    "createdAt": "2026-01-21T10:30:00Z",
    "updatedAt": "2026-01-21T10:30:00Z"
  }
}
```

---

### 5. Review Fraud Case (Admin)

**PUT** `/api/fraud/cases/:id/review`

Review a fraud case and take action.

#### Request Body
```json
{
  "decision": "confirmed",
  "notes": "Verified fraudulent activity. Multiple chargeback attempts confirmed. Account suspended pending investigation.",
  "actionTaken": {
    "type": "account_suspended",
    "details": "Account suspended for 30 days pending resolution of disputes"
  }
}
```

#### Decision Options
- `pending` - Still under review
- `confirmed` - Fraud confirmed
- `dismissed` - False positive
- `needs_more_info` - Requires additional investigation

#### Action Types
- `account_suspended` - Temporarily suspend account
- `account_banned` - Permanently ban account
- `funds_held` - Hold funds pending investigation
- `warning_issued` - Issue warning to user
- `no_action` - No action required

#### Response (200 OK)
```json
{
  "message": "Fraud case reviewed successfully",
  "fraudCase": {
    "_id": "507f1f77bcf86cd799439044",
    "status": "confirmed_fraud",
    "review": {
      "reviewedBy": {
        "_id": "507f1f77bcf86cd799439055",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "reviewedAt": "2026-01-21T15:45:00Z",
      "decision": "confirmed",
      "notes": "Verified fraudulent activity...",
      "actionTaken": {
        "type": "account_suspended",
        "appliedAt": "2026-01-21T15:45:00Z",
        "appliedBy": "507f1f77bcf86cd799439055",
        "details": "Account suspended for 30 days..."
      }
    }
  }
}
```

---

### 6. Resolve Fraud Case (Admin)

**PUT** `/api/fraud/cases/:id/resolve`

Mark a fraud case as resolved with final outcome.

#### Request Body
```json
{
  "outcome": "fraud_confirmed",
  "details": "User admitted to fraudulent activity. Account permanently banned. All pending transactions refunded to buyers."
}
```

#### Outcome Options
- `fraud_confirmed` - Fraud was confirmed
- `false_alarm` - Not fraud, case closed
- `preventive_action_taken` - Preventive measures applied

#### Response (200 OK)
```json
{
  "message": "Fraud case resolved successfully",
  "fraudCase": {
    "_id": "507f1f77bcf86cd799439044",
    "resolved": true,
    "resolvedAt": "2026-01-21T16:00:00Z",
    "resolution": {
      "outcome": "fraud_confirmed",
      "details": "User admitted to fraudulent activity...",
      "resolvedBy": {
        "_id": "507f1f77bcf86cd799439055",
        "name": "Admin User"
      }
    }
  }
}
```

---

### 7. Add Notes to Fraud Case (Admin)

**POST** `/api/fraud/cases/:id/notes`

Add investigation notes to a fraud case.

#### Request Body
```json
{
  "note": "Contacted buyer who confirmed they did not authorize these orders. IP addresses trace to known VPN service."
}
```

#### Response (200 OK)
```json
{
  "message": "Note added successfully",
  "fraudCase": {
    "_id": "507f1f77bcf86cd799439044",
    "review": {
      "notes": "[2026-01-21T16:30:00.000Z] Contacted buyer who confirmed they did not authorize these orders. IP addresses trace to known VPN service."
    }
  }
}
```

---

### 8. Get Fraud Statistics (Admin)

**GET** `/api/fraud/statistics`

Get dashboard statistics and analytics.

#### Response (200 OK)
```json
{
  "statistics": {
    "totalCases": 127,
    "pendingReview": 23,
    "confirmedFraud": 45,
    "falsePositives": 12,
    "immediateRiskCases": 5,
    "averageFraudScore": 68.5,
    "recentCases": 18,
    "topCategories": [
      { "_id": "transactional", "count": 89 },
      { "_id": "behavioral", "count": 67 },
      { "_id": "account", "count": 45 },
      { "_id": "pattern", "count": 34 },
      { "_id": "payment", "count": 23 }
    ]
  }
}
```

---

## Data Models

### FraudUser Schema

```typescript
{
  _id: ObjectId,
  user: ObjectId,                    // Reference to User
  fraudScore: Number (0-100),        // AI-calculated risk score
  status: String,                     // pending_review | confirmed_fraud | false_positive | monitoring
  
  // AI Detection Details
  aiAnalysis: {
    model: String,                    // AI model name
    confidence: Number (0-100),       // Confidence level
    detectedAt: Date,
    analysisVersion: String
  },
  
  // Detailed Flags
  flags: [{
    category: String,                 // behavioral | transactional | account | pattern | payment
    severity: String,                 // low | medium | high | critical
    description: String,
    evidence: Mixed,                  // Flexible evidence data
    detectedAt: Date
  }],
  
  // Triggering Event
  triggeringEvent: {
    type: String,                     // order | message | profile_update | payment | review | other
    referenceId: ObjectId,            // Reference to triggering document
    details: Mixed,
    timestamp: Date
  },
  
  // User Snapshot at Detection Time
  userSnapshot: {
    accountAge: Number,               // Days since account creation
    totalOrders: Number,
    cancelledOrders: Number,
    completedOrders: Number,
    averageOrderValue: Number,
    totalSpent: Number,
    totalEarned: Number,
    verificationStatus: {
      email: Boolean,
      phone: Boolean,
      identity: Boolean
    },
    recentActivity: {
      ordersLast24h: Number,
      ordersLast7days: Number,
      messagesLast24h: Number,
      loginLocations: [String],
      deviceInfo: [String]
    }
  },
  
  // Suspicious Patterns
  suspiciousPatterns: [{
    pattern: String,
    occurrences: Number,
    severity: String,                 // low | medium | high
    examples: [Mixed]
  }],
  
  // Admin Review
  review: {
    reviewedBy: ObjectId,             // Admin user reference
    reviewedAt: Date,
    decision: String,                 // pending | confirmed | dismissed | needs_more_info
    notes: String,
    actionTaken: {
      type: String,                   // account_suspended | account_banned | funds_held | warning_issued | no_action
      appliedAt: Date,
      appliedBy: ObjectId,
      details: String
    }
  },
  
  // Historical Context
  priorFlags: [{
    flaggedAt: Date,
    reason: String,
    resolved: Boolean,
    resolution: String
  }],
  
  // Related Cases
  relatedCases: [ObjectId],           // References to other FraudUser documents
  
  // Risk Assessment
  riskAssessment: {
    immediateRisk: Boolean,
    potentialLoss: Number,
    affectedUsers: Number,
    recommendedAction: String         // immediate_suspension | monitor_closely | manual_review | automated_limits
  },
  
  // Resolution
  resolved: Boolean,
  resolvedAt: Date,
  resolution: {
    outcome: String,                  // fraud_confirmed | false_alarm | preventive_action_taken
    details: String,
    resolvedBy: ObjectId
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastCheckedAt: Date
}
```

---

## Usage Examples

### Example 1: Integrate with Order Creation

```typescript
import { analyzeOrderForFraud, detectSuspiciousPatterns } from '../services/fraud-detection.service';

export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const orderData = req.body;
    
    // Get user's order history
    const userOrders = await Order.find({ buyer: userId });
    const suspiciousPatterns = await detectSuspiciousPatterns(userId, userOrders);
    
    // Calculate account age
    const accountAge = Math.floor(
      (Date.now() - req.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Perform fraud analysis
    const fraudAnalysis = await analyzeOrderForFraud({
      userId: userId,
      buyerId: userId,
      sellerId: orderData.seller,
      price: orderData.price,
      buyerHistory: {
        totalOrders: userOrders.length,
        cancelledOrders: userOrders.filter(o => o.status === 'cancelled').length,
        averageOrderValue: userOrders.reduce((sum, o) => sum + o.price, 0) / userOrders.length || 0,
        accountAge: accountAge
      },
      orderDetails: {
        requirements: orderData.requirements,
        deliveryTime: orderData.deliveryTime,
        unusualPatterns: suspiciousPatterns
      },
      triggeringEvent: {
        type: 'order',
        referenceId: null, // Will be set after order creation
        details: orderData,
        timestamp: new Date()
      }
    });
    
    // Check recommendation
    if (fraudAnalysis.recommendation === 'reject') {
      return res.status(403).json({
        error: 'Order cannot be processed due to security concerns',
        reasons: fraudAnalysis.reasons,
        fraudScore: fraudAnalysis.riskScore
      });
    }
    
    // Create the order
    const order = await Order.create({
      ...orderData,
      buyer: userId,
      fraudAnalysis: {
        score: fraudAnalysis.riskScore,
        analyzed: true,
        analyzedAt: new Date(),
        needsReview: fraudAnalysis.recommendation === 'review'
      }
    });
    
    // Update triggering event with order ID
    if (fraudAnalysis.riskScore >= 70) {
      // User was auto-flagged, update the reference
      await FraudUser.findOneAndUpdate(
        { user: userId, resolved: false },
        { 'triggeringEvent.referenceId': order._id }
      );
    }
    
    // Alert if needs manual review
    if (fraudAnalysis.recommendation === 'review') {
      console.log(`⚠️ Order ${order._id} flagged for fraud review`);
      // Send notification to fraud team
    }
    
    res.status(201).json({
      order,
      fraudCheck: {
        score: fraudAnalysis.riskScore,
        status: fraudAnalysis.recommendation
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

### Example 2: Check Before Processing Payment

```typescript
export const processPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    
    // Check fraud status
    const fraudCheck = await fetch(`/api/fraud/check/${userId}`);
    const fraudData = await fraudCheck.json();
    
    if (fraudData.isFlagged) {
      switch (fraudData.recommendation) {
        case 'immediate_suspension':
          return res.status(403).json({
            error: 'Payment blocked',
            message: 'Your account is under review for suspicious activity'
          });
          
        case 'monitor_closely':
          // Allow but add additional verification
          return res.status(200).json({
            requiresAdditionalVerification: true,
            message: 'Please verify your identity to proceed'
          });
          
        case 'manual_review':
          // Process but flag for review
          console.log(`Payment from flagged user ${userId} - monitoring`);
          break;
      }
    }
    
    // Process payment normally
    const payment = await processOrderPayment(orderId);
    res.json({ payment });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

### Example 3: Admin Dashboard Implementation

```typescript
// Fraud Dashboard Component
export const FraudDashboard = async () => {
  // Get statistics
  const stats = await fetch('/api/fraud/statistics').then(r => r.json());
  
  // Get pending cases
  const pendingCases = await fetch(
    '/api/fraud/cases?status=pending_review&page=1&limit=10'
  ).then(r => r.json());
  
  // Get immediate risk cases
  const urgentCases = await fetch(
    '/api/fraud/cases?immediateRisk=true&resolved=false'
  ).then(r => r.json());
  
  return {
    stats: stats.statistics,
    pending: pendingCases.fraudUsers,
    urgent: urgentCases.fraudUsers
  };
};
```

---

### Example 4: Admin Reviews Case

```typescript
export const handleReviewCase = async (caseId, decision) => {
  const review = await fetch(`/api/fraud/cases/${caseId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: 'confirmed',
      notes: 'Confirmed fraud through IP analysis and chargeback history',
      actionTaken: {
        type: 'account_banned',
        details: 'Permanent ban due to confirmed fraudulent activity'
      }
    })
  });
  
  const result = await review.json();
  
  // Then resolve the case
  await fetch(`/api/fraud/cases/${caseId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      outcome: 'fraud_confirmed',
      details: 'Case closed. User banned permanently.'
    })
  });
};
```

---

## Integration Guide

### Step 1: Import Services

```typescript
import { 
  analyzeOrderForFraud, 
  detectSuspiciousPatterns 
} from '../services/fraud-detection.service';
```

### Step 2: Add Fraud Check to Order Flow

```typescript
// In your order controller
const fraudAnalysis = await analyzeOrderForFraud({
  userId: req.user._id,
  buyerId: req.user._id,
  sellerId: req.body.seller,
  price: req.body.price,
  orderDetails: { /* ... */ },
  triggeringEvent: { /* ... */ }
});

if (fraudAnalysis.recommendation === 'reject') {
  return res.status(403).json({ error: 'Order blocked' });
}
```

### Step 3: Check User Status Before Transactions

```typescript
const response = await fetch(`/api/fraud/check/${userId}`);
const { isFlagged, recommendation } = await response.json();

if (isFlagged && recommendation === 'immediate_suspension') {
  // Block transaction
}
```

### Step 4: Setup Admin Routes (Optional Authentication)

In `frauduser.routes.ts`, uncomment the authentication middleware:

```typescript
router.get("/cases", authenticateToken, isAdmin, getFlaggedUsers);
```

---

## Admin Dashboard Guide

### Dashboard Overview

The admin dashboard should display:

1. **Statistics Panel**
   - Total cases
   - Pending reviews
   - Confirmed fraud
   - Immediate risk cases
   - Average fraud score

2. **Urgent Cases Table**
   - Cases with `immediateRisk: true`
   - Sorted by fraud score (highest first)
   - Quick action buttons

3. **Pending Review Queue**
   - All cases with `status: pending_review`
   - Filter by score range
   - Batch actions

4. **Case Details View**
   - Complete user snapshot
   - AI analysis details
   - All flags with evidence
   - Review notes history
   - Action buttons

### Recommended Actions by Risk Level

| Fraud Score | Status | Recommended Action |
|-------------|--------|-------------------|
| 0-40 | Low Risk | No action required |
| 41-60 | Medium Risk | Monitor closely |
| 61-79 | High Risk | Manual review required |
| 80-100 | Critical | Immediate suspension |

### Review Workflow

1. **Receive Alert** → New fraud case flagged
2. **Review Details** → Examine evidence, patterns, user history
3. **Make Decision** → Confirm, dismiss, or request more info
4. **Take Action** → Suspend, ban, warn, or monitor
5. **Resolve Case** → Close with final outcome
6. **Monitor** → Track user behavior post-resolution

---

## Security Considerations

### Best Practices

1. **Always check fraud status before**:
   - Processing payments
   - Creating high-value orders
   - Transferring funds
   - Verifying accounts

2. **Set appropriate thresholds**:
   - Auto-flag at score ≥70
   - Auto-suspend at score ≥85
   - Require manual review for scores 60-84

3. **Protect admin endpoints**:
   - Require authentication
   - Verify admin role
   - Log all admin actions
   - Rate limit API calls

4. **Privacy compliance**:
   - Store only necessary evidence
   - Allow users to appeal
   - Delete resolved cases after retention period
   - Anonymize data when possible

### Error Handling

The system is designed to fail safely:
- If AI analysis fails → defaults to manual review
- If fraud check fails → allows transaction but logs error
- Network issues → queues analysis for retry

---

## Monitoring & Alerts

### Key Metrics to Track

- Fraud detection rate (% of orders analyzed)
- False positive rate
- Average review time
- Prevented fraud value
- Most common fraud patterns

### Alert Triggers

- Immediate risk case created
- Fraud score ≥90
- Multiple flags in short time
- Related cases detected
- Pattern threshold exceeded

---

## Testing

### Test Flag User

```bash
curl -X POST http://localhost:3000/api/fraud/flag \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "fraudScore": 75,
    "flags": [{
      "category": "transactional",
      "severity": "high",
      "description": "Test flag",
      "evidence": {}
    }],
    "triggeringEvent": {
      "type": "order",
      "details": {},
      "timestamp": "2026-01-21T10:00:00Z"
    }
  }'
```

### Test Check User

```bash
curl http://localhost:3000/api/fraud/check/USER_ID_HERE
```

### Test Get Cases

```bash
curl http://localhost:3000/api/fraud/cases?status=pending_review&limit=5
```

---

## FAQ

**Q: When does the AI automatically flag users?**  
A: Users are auto-flagged when their fraud score reaches ≥70.

**Q: Can users appeal fraud flags?**  
A: Yes, implement an appeal system that creates a review note and sets decision to `needs_more_info`.

**Q: How long are fraud records kept?**  
A: Implement your own retention policy. Consider deleting false positives after 90 days and resolved cases after 1 year.

**Q: What if the AI makes mistakes?**  
A: The system requires admin review for all cases. Admins can dismiss false positives with the `dismissed` decision.

**Q: Can I customize the AI prompt?**  
A: Yes, edit the prompt in `fraud-detection.service.ts` to adjust detection criteria.

**Q: How do I handle appeals?**  
A: Create an appeals endpoint that updates the case notes and sets `review.decision` to `needs_more_info`.

---

## Support

For issues or questions:
- Check the case details for AI reasoning
- Review the evidence provided
- Examine user snapshot data
- Consult with fraud team
- Add detailed notes to cases

---

---

## Report System

### Overview

The Report System allows buyers to report sellers for misconduct. Only buyers with good standing (low fraud scores and credible history) can submit reports. Reports are weighted by the reporter's credibility score, and sellers are automatically flagged when they receive multiple credible reports.

### Credibility Score System

Every report is validated against the reporter's credibility to prevent abuse and false reports.

#### Credibility Score Calculation (0-100)

**Base Score**: 100

**Penalties:**
- Fraud Score ≥70: -50 (major penalty)
- Fraud Score 50-69: -30
- Fraud Score 30-49: -15
- Poor report history (<30% accuracy): -20

**Bonuses:**
- Verified email: +10
- Account age ≥90 days: +10
- Account age ≥30 days: +5
- 10+ completed orders: +10
- 5+ completed orders: +5
- Report accuracy ≥80%: +15

#### Reporting Requirements

To submit a report, buyers must meet these criteria:

| Requirement | Minimum |
|-------------|---------|
| Credibility Score | ≥30 |
| Fraud Score | <50 |
| Completed Orders | ≥3 (recommended) |
| Account Status | Active, not flagged |

### Report Categories

| Category | Description | Example |
|----------|-------------|---------|
| `non_delivery` | Seller didn't deliver as promised | Order marked complete but nothing delivered |
| `fake_service` | Service doesn't match description | Portfolio shown was not theirs |
| `poor_quality` | Significantly below expected quality | Delivered work unusable/incomplete |
| `scam` | Fraudulent or deceptive behavior | Took payment and disappeared |
| `overcharge` | Charged more than agreed | Added hidden fees after payment |
| `harassment` | Inappropriate behavior/communication | Threatening messages, abuse |
| `other` | Other issues | Miscellaneous violations |

### Severity Levels

| Severity | When to Use | Impact |
|----------|-------------|--------|
| `low` | Minor issues, one-time problems | Low priority review |
| `medium` | Repeated issues, quality problems | Standard review queue |
| `high` | Serious violations, pattern of issues | High priority, faster review |
| `critical` | Scam, fraud, severe violations | Immediate review, auto-flag at threshold |

---

## Report API Endpoints

### Base URL
```
/api/reports
```

### 1. Submit Report

**POST** `/api/reports/submit`

Submit a report against a seller. Requires authentication and good account standing. Supports multipart/form-data for uploading screenshot evidence.

#### Content-Type Options

**Option 1: JSON (No file uploads)**
```
Content-Type: application/json
```

**Option 2: Multipart Form Data (With screenshots)**
```
Content-Type: multipart/form-data
```

#### Request Body (JSON)
```json
{
  "reportedUserId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439022",
  "category": "non_delivery",
  "severity": "high",
  "description": "Seller marked order as complete but never delivered any files. Stopped responding to messages after payment was released.",
  "evidence": {
    "screenshots": [
      "https://cloudinary.com/screenshot1.png"
    ],
    "messages": ["msg_id_1", "msg_id_2"],
    "files": [],
    "additionalInfo": {
      "orderCompletedDate": "2026-01-15T10:00:00Z",
      "lastSellerResponse": "2026-01-14T18:30:00Z"
    }
  }
}
```

#### Request Body (Multipart with File Uploads)
```
Form Fields:
- data: JSON string containing report data
- screenshots: File[] (max 5 files, 10MB each)

Example:
data: {
  "reportedUserId": "507f...",
  "orderId": "507f...",
  "category": "non_delivery",
  "severity": "high",
  "description": "Seller never delivered..."
}
screenshots: [file1.png, file2.jpg]
```

#### File Upload Specifications
- **Field name**: `screenshots`
- **Max files**: 5
- **Max size per file**: 10MB
- **Allowed formats**: PNG, JPG, JPEG, WebP, GIF, HEIC, HEIF, SVG
- **Upload location**: Cloudinary folder `reports/evidence`

#### Success Response (201 Created)
```json
{
  "message": "Report submitted successfully",
  "report": {
    "_id": "507f1f77bcf86cd799439044",
    "reporter": "507f1f77bcf86cd799439033",
    "reportedUser": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Seller Name",
      "email": "seller@example.com",
      "username": "seller123"
    },
    "order": {
      "_id": "507f1f77bcf86cd799439022",
      "price": 150,
      "status": "completed"
    },
    "category": "non_delivery",
    "severity": "high",
    "description": "Seller marked order as complete...",
    "evidence": {
      "screenshots": [
        "https://res.cloudinary.com/.../reports/evidence/abc123.png",
        "https://res.cloudinary.com/.../reports/evidence/def456.jpg"
      ],
      "messages": ["msg_id_1", "msg_id_2"]
    },
    "reporterCredibility": {
      "fraudScore": 5,
      "totalOrders": 15,
      "accountAge": 120,
      "verifiedAccount": true,
      "credibilityScore": 95,
      "priorReports": 2,
      "priorReportsAccepted": 2
    },
    "status": "under_review",
    "priority": "high",
    "createdAt": "2026-01-21T10:00:00Z"
  },
  "credibilityScore": 95,
  "priority": "high",
  "uploadedScreenshots": 2
}
```

#### Error Responses

**Low Credibility (403)**
```json
{
  "error": "Your account does not meet the requirements to submit reports",
  "reason": "Low credibility score",
  "requirements": {
    "completedOrders": "Complete at least 3 orders",
    "verifyAccount": "Verify your email",
    "maintainGoodStanding": "Maintain a good account standing"
  }
}
```

**Account Flagged (403)**
```json
{
  "error": "Your account is flagged and cannot submit reports at this time",
  "reason": "Account under review for suspicious activity"
}
```

**Already Reported (400)**
```json
{
  "error": "You have already reported this order",
  "existingReport": "507f1f77bcf86cd799439044"
}
```

**Not Order Buyer (403)**
```json
{
  "error": "You can only report orders you purchased"
}
```

---

### 2. Get My Reports

**GET** `/api/reports/my-reports`

Retrieve all reports submitted by the authenticated user.

#### Response (200 OK)
```json
{
  "reports": [
    {
      "_id": "507f1f77bcf86cd799439044",
      "reportedUser": {
        "name": "Seller Name",
        "username": "seller123"
      },
      "order": {
        "_id": "507f1f77bcf86cd799439022",
        "price": 150,
        "status": "completed"
      },
      "category": "non_delivery",
      "severity": "high",
      "status": "accepted",
      "priority": "high",
      "review": {
        "decision": "valid",
        "notes": "Confirmed non-delivery. Refund issued."
      },
      "createdAt": "2026-01-21T10:00:00Z",
      "updatedAt": "2026-01-21T14:30:00Z"
    }
  ]
}
```

---

### 3. Get Seller Reports

**GET** `/api/reports/seller/:sellerId`

View all reports filed against a specific seller.

#### Response (200 OK)
```json
{
  "reports": [
    {
      "_id": "507f1f77bcf86cd799439044",
      "reporter": {
        "name": "Buyer Name",
        "username": "buyer123"
      },
      "category": "non_delivery",
      "severity": "high",
      "status": "accepted",
      "createdAt": "2026-01-21T10:00:00Z"
    }
  ],
  "stats": {
    "total": 5,
    "pending": 1,
    "accepted": 3,
    "rejected": 1,
    "byCategory": {
      "non_delivery": 3,
      "poor_quality": 1,
      "overcharge": 1
    }
  }
}
```

---

### 4. Get All Reports (Admin)

**GET** `/api/reports/all`

Retrieve all reports with filtering and pagination.

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `pending`, `under_review`, `accepted`, `rejected` |
| `priority` | string | Filter by priority | `low`, `medium`, `high`, `urgent` |
| `category` | string | Filter by category | `non_delivery`, `scam` |
| `reportedUserId` | string | Filter by seller | `507f1f77bcf86cd799439011` |
| `minCredibility` | number | Min credibility score | `70` |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `20` |

#### Example Request
```
GET /api/reports/all?status=under_review&priority=high&minCredibility=70&page=1&limit=10
```

#### Response (200 OK)
```json
{
  "reports": [
    {
      "_id": "507f1f77bcf86cd799439044",
      "reporter": {
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe"
      },
      "reportedUser": {
        "name": "Seller Name",
        "email": "seller@example.com",
        "username": "seller123",
        "createdAt": "2025-10-01T00:00:00Z"
      },
      "order": {
        "_id": "507f1f77bcf86cd799439022",
        "price": 150,
        "status": "completed"
      },
      "category": "non_delivery",
      "severity": "high",
      "reporterCredibility": {
        "credibilityScore": 85,
        "fraudScore": 10,
        "totalOrders": 12
      },
      "status": "under_review",
      "priority": "high",
      "createdAt": "2026-01-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

### 5. Get Report Details (Admin)

**GET** `/api/reports/:id`

Get detailed information about a specific report.

#### Response (200 OK)
```json
{
  "report": {
    "_id": "507f1f77bcf86cd799439044",
    "reporter": {
      "_id": "507f1f77bcf86cd799439033",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "createdAt": "2025-08-15T00:00:00Z",
      "verifiedEmail": true
    },
    "reportedUser": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Seller Name",
      "email": "seller@example.com",
      "username": "seller123",
      "createdAt": "2025-10-01T00:00:00Z"
    },
    "order": {
      "_id": "507f1f77bcf86cd799439022",
      "buyer": "507f1f77bcf86cd799439033",
      "seller": "507f1f77bcf86cd799439011",
      "price": 150,
      "status": "completed",
      "deliveryTime": 3,
      "createdAt": "2026-01-15T00:00:00Z"
    },
    "category": "non_delivery",
    "severity": "high",
    "description": "Seller marked order as complete but never delivered any files...",
    "evidence": {
      "screenshots": ["url1", "url2"],
      "messages": ["msg_id_1", "msg_id_2"],
      "additionalInfo": {
        "orderCompletedDate": "2026-01-15T10:00:00Z"
      }
    },
    "reporterCredibility": {
      "fraudScore": 5,
      "totalOrders": 15,
      "accountAge": 120,
      "verifiedAccount": true,
      "credibilityScore": 95,
      "priorReports": 2,
      "priorReportsAccepted": 2
    },
    "status": "under_review",
    "priority": "high",
    "review": {
      "decision": "pending",
      "notes": ""
    },
    "impact": {
      "similarReports": 2
    },
    "createdAt": "2026-01-21T10:00:00Z",
    "updatedAt": "2026-01-21T10:00:00Z"
  }
}
```

---

### 6. Review Report (Admin)

**PUT** `/api/reports/:id/review`

Review a report and take action.

#### Request Body
```json
{
  "decision": "valid",
  "notes": "Verified non-delivery. Contacted both parties. Seller confirmed they did not deliver due to 'technical issues' but provided no proof of work. Issuing refund and flagging seller.",
  "actionTaken": {
    "type": "seller_flagged",
    "details": "Seller flagged for fraud investigation. 3rd report of non-delivery in 30 days."
  }
}
```

#### Decision Options
- `pending` - Still under review
- `valid` - Report confirmed as valid
- `invalid` - Report is false/unfounded
- `needs_investigation` - Requires more information

#### Action Types
- `warning_issued` - Warning sent to seller
- `seller_flagged` - Seller flagged for fraud review
- `seller_suspended` - Seller account suspended
- `no_action` - No action required
- `refund_issued` - Buyer refunded

#### Response (200 OK)
```json
{
  "message": "Report reviewed successfully",
  "report": {
    "_id": "507f1f77bcf86cd799439044",
    "status": "accepted",
    "review": {
      "reviewedBy": {
        "_id": "507f1f77bcf86cd799439055",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "reviewedAt": "2026-01-21T15:00:00Z",
      "decision": "valid",
      "notes": "Verified non-delivery...",
      "actionTaken": {
        "type": "seller_flagged",
        "appliedAt": "2026-01-21T15:00:00Z",
        "details": "Seller flagged for fraud investigation..."
      }
    }
  }
}
```

---

## Seller Auto-Flagging System

Sellers are automatically flagged for fraud investigation when they meet certain thresholds based on buyer reports.

### Auto-Flag Triggers

A seller is automatically flagged when:

1. **Multiple High-Credibility Reports**
   - 2+ reports from buyers with credibility ≥70
   - Fraud score adjustment: +25

2. **Report Volume**
   - 5+ total accepted/under review reports
   - Fraud score adjustment: +30
   - 3+ reports: +20

3. **Critical/High Severity Reports**
   - 2+ critical or high severity reports
   - Fraud score adjustment: +20

4. **Serious Category Reports**
   - 2+ reports in categories: scam, non_delivery, fake_service
   - Fraud score adjustment: +25

5. **Low Completion Rate**
   - Order completion rate <50% AND reports exist
   - Fraud score adjustment: +15

### Fraud Score Calculation

```
Base Score: 0
+ Report Count Factor (0-30)
+ High Credibility Reporter Factor (0-25)
+ Critical Severity Factor (0-20)
+ Serious Category Factor (0-25)
+ Low Completion Rate Factor (0-15)
= Total Fraud Score (0-100)
```

**Action Thresholds:**
- Score 50-64: Manual review
- Score 65-79: Monitor closely
- Score 80+: Immediate suspension

### Example Auto-Flag

```json
{
  "seller": "507f1f77bcf86cd799439011",
  "fraudScore": 75,
  "triggeredBy": "multiple_credible_reports",
  "flags": [
    {
      "category": "pattern",
      "severity": "high",
      "description": "5 reports filed against seller",
      "evidence": { "reportCount": 5 }
    },
    {
      "category": "behavioral",
      "severity": "high",
      "description": "Multiple reports from highly credible buyers",
      "evidence": { "count": 3 }
    },
    {
      "category": "transactional",
      "severity": "critical",
      "description": "Reports indicate potential scam activity",
      "evidence": { "categories": ["scam", "non_delivery"] }
    }
  ],
  "affectedUsers": 5,
  "recommendedAction": "monitor_closely"
}
```

---

## Integration Examples

### Example 1: Add Report Button to Order Page

```typescript
// Frontend - Order Details Page
import { useState } from 'react';

export const OrderActions = ({ order, currentUser }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Only show report button if user is buyer and order is completed
  const canReport = order.buyer._id === currentUser._id && 
                    order.status === 'completed';
  
  if (!canReport) return null;
  
  return (
    <>
      <button onClick={() => setShowReportModal(true)}>
        Report Issue
      </button>
      
      {showReportModal && (
        <ReportModal 
          orderId={order._id}
          sellerId={order.seller._id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
};
```

### Example 2: Submit Report

```typescript
const submitReport = async (reportData) => {
  try {
    // Create FormData for file uploads
    const formData = new FormData();
    
    // Add report data as JSON string
    formData.append('data', JSON.stringify({
      reportedUserId: reportData.sellerId,
      orderId: reportData.orderId,
      category: reportData.category,
      severity: reportData.severity,
      description: reportData.description,
      evidence: {
        messages: reportData.messageIds
      }
    }));
    
    // Add screenshot files
    reportData.screenshotFiles.forEach(file => {
      formData.append('screenshots', file);
    });
    
    const response = await fetch('/api/reports/submit', {
      method: 'POST',
      body: formData
      // Don't set Content-Type header - browser will set it with boundary
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(`Report submitted! Uploaded ${result.uploadedScreenshots} screenshots`);
      console.log('Evidence URLs:', result.report.evidence.screenshots);
    } else {
      if (response.status === 403) {
        alert(result.error);
        showRequirements(result.requirements);
      }
    }
  } catch (error) {
    console.error('Error submitting report:', error);
  }
};

// Usage example
const fileInput = document.querySelector('#screenshot-input');
submitReport({
  sellerId: '507f...',
  orderId: '507f...',
  category: 'non_delivery',
  severity: 'high',
  description: 'Seller did not deliver the promised work...',
  messageIds: ['msg1', 'msg2'],
  screenshotFiles: Array.from(fileInput.files)
});
```

### Example 3: Check Before Allowing Report

```typescript
const checkCanReport = async (userId) => {
  // Check user's fraud status
  const fraudCheck = await fetch(`/api/fraud/check/${userId}`);
  const fraudData = await fraudCheck.json();
  
  if (fraudData.isFlagged || fraudData.highestScore >= 50) {
    return {
      canReport: false,
      reason: 'Your account is under review and cannot submit reports'
    };
  }
  
  // Check user has completed orders
  const userOrders = await fetch(`/api/orders/my-orders`);
  const orders = await userOrders.json();
  const completedOrders = orders.filter(o => o.status === 'completed');
  
  if (completedOrders.length < 3) {
    return {
      canReport: false,
      reason: 'You need at least 3 completed orders to submit reports'
    };
  }
  
  return { canReport: true };
};
```

### Example 4: Display Seller Report History

```typescript
const SellerProfile = ({ sellerId }) => {
  const [reports, setReports] = useState(null);
  
  useEffect(() => {
    fetch(`/api/reports/seller/${sellerId}`)
      .then(r => r.json())
      .then(data => setReports(data));
  }, [sellerId]);
  
  if (!reports) return <Loading />;
  
  return (
    <div>
      <h3>Seller Reputation</h3>
      {reports.stats.total > 0 && (
        <div className="warning">
          <p>⚠️ This seller has {reports.stats.total} report(s)</p>
          <ul>
            {Object.entries(reports.stats.byCategory).map(([cat, count]) => (
              <li key={cat}>{cat}: {count}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### Example 5: Admin Review Dashboard

```typescript
const AdminReportsDashboard = () => {
  const [urgentReports, setUrgentReports] = useState([]);
  
  useEffect(() => {
    // Get high-priority reports from credible reporters
    fetch('/api/reports/all?priority=urgent&minCredibility=70&status=under_review')
      .then(r => r.json())
      .then(data => setUrgentReports(data.reports));
  }, []);
  
  const reviewReport = async (reportId, decision) => {
    await fetch(`/api/reports/${reportId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: decision,
        notes: 'Reviewed and verified',
        actionTaken: decision === 'valid' ? {
          type: 'seller_flagged',
          details: 'Flagged for investigation'
        } : null
      })
    });
    
    // Refresh list
    loadReports();
  };
  
  return (
    <div>
      <h2>Urgent Reports ({urgentReports.length})</h2>
      {urgentReports.map(report => (
        <ReportCard 
          key={report._id}
          report={report}
          onReview={reviewReport}
        />
      ))}
    </div>
  );
};
```

---

## Best Practices

### For Platform Administrators

1. **Review High-Priority Reports First**
   - Focus on reports with priority = "urgent"
   - Prioritize reports from high-credibility reporters (≥80)
   - Critical severity reports need immediate attention

2. **Verify Evidence**
   - Check screenshots and message history
   - Contact both parties if needed
   - Review order timeline and delivery status

3. **Pattern Recognition**
   - Watch for multiple reports against same seller
   - Look for similar complaints across different buyers
   - Track report categories for trends

4. **Fair Resolution**
   - Consider reporter credibility but investigate thoroughly
   - Give sellers chance to respond
   - Document all decisions clearly

### For Buyers (Reporters)

1. **Be Honest and Detailed**
   - Provide clear, factual descriptions (20+ characters)
   - Include all relevant evidence
   - Don't exaggerate or make false claims

2. **Choose Correct Category and Severity**
   - Select the most accurate category
   - Use "critical" only for severe violations
   - "Low" for minor issues that can be resolved

3. **Build Credibility**
   - Complete orders to build history
   - Verify your email
   - Maintain good account standing
   - Submit accurate reports only

4. **Timing Matters**
   - Report soon after issue occurs
   - Wait for order completion before reporting
   - One report per order (no duplicates)

### For Sellers

1. **Maintain Good Standing**
   - Deliver orders as promised
   - Communicate clearly with buyers
   - Resolve issues proactively

2. **Respond to Reports**
   - Work with admin team if reported
   - Provide evidence of delivery
   - Address complaints professionally

3. **Monitor Your Reputation**
   - Check your report history periodically
   - Address patterns if multiple reports occur
   - Improve service quality

---

## Security Considerations

### Report Abuse Prevention

1. **Credibility Gating**
   - Minimum credibility score of 30 required
   - Blocks users with fraud score ≥50
   - Requires completed orders

2. **Duplicate Prevention**
   - One report per order per user
   - Validates buyer-seller-order relationship

3. **Evidence Validation**
   - Store evidence URLs securely
# With JSON only (no file uploads)
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reportedUserId": "SELLER_ID",
    "orderId": "ORDER_ID",
    "category": "non_delivery",
    "severity": "high",
    "description": "Seller did not deliver the promised service despite marking it complete"
  }'

# With file uploads (multipart)
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'data={
    "reportedUserId": "SELLER_ID",
    "orderId": "ORDER_ID",
    "category": "non_delivery",
    "severity": "high",
    "description": "Seller did not deliver the promised service despite marking it complete"
  }' \
  -F 'screenshots=@/path/to/screenshot1.png' \
  -F 'screenshots=@/path/to/screenshot2.jpg
- Reporter identity visible to admins only
- Sellers see report count but not reporter names (public endpoint)
- Evidence stored securely with access controls
- GDPR compliance: data deletion on request

---

## Testing

### Test Submit Valid Report

```bash
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reportedUserId": "SELLER_ID",
    "orderId": "ORDER_ID",
    "category": "non_delivery",
    "severity": "high",
    "description": "Seller did not deliver the promised service despite marking it complete"
  }'
```

### Test Get My Reports

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/reports/my-reports
```

### Test Admin Review

```bash
curl -X PUT http://localhost:3000/api/reports/REPORT_ID/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "decision": "valid",
    "notes": "Verified and confirmed",
    "actionTaken": {
      "type": "seller_flagged",
      "details": "Flagged for investigation"
    }
  }'
```

---

## FAQ - Report System

**Q: Can I report a seller multiple times?**  
A: No, you can only submit one report per order. If you have multiple orders with issues, report each order separately.

**Q: Why can't I submit a report?**  
A: You need a credibility score ≥30, which requires completed orders, verified email, and good account standing (no fraud flags).

**Q: Will the seller know I reported them?**  
A: Sellers can see they have reports but not who submitted them (unless admin shares in investigation).

**Q: How long does review take?**  
A: High-priority reports are typically reviewed within 24-48 hours. Lower priority may take 3-5 days.

**Q: What happens if my report is rejected?**  
A: Rejected reports lower your credibility score. Only submit accurate, honest reports to maintain good standing.

**Q: Can I appeal a seller's response?**  
A: Add detailed notes to your report. Admins review all evidence from both parties before making decisions.

**Q: Does reporting automatically ban the seller?**  
A: No. Reports trigger investigation. Sellers are only flagged/suspended after admin review confirms violations.

**Q: How many reports before a seller is flagged?**  
A: It depends on report credibility and severity. Generally 3+ credible reports or 2+ critical reports trigger investigation.

---

**Last Updated**: January 21, 2026  
**API Version**: 1.0  
**AI Model**: Llama 4 Maverick via Groq
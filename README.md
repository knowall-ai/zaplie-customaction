# Zaplie Custom Action API

Custom Action API for automatically sending sats (satoshis) to users as rewards. Integrates with LNbits and Nostr wallets.

## Overview

Zaplie Custom Action API enables automated reward distribution using Bitcoin Lightning Network. Call this API from anywhere - Power Automate flows, custom code, webhooks, or any HTTP client - to send sats to users as rewards for completing tasks.

### Use Cases

- **Timesheet Compliance** - Reward users for submitting timesheets daily/on-time
- **SLA Achievement** - Reward support agents for meeting ticket SLA targets
- **Daily Standups** - Reward team members for attending/participating
- **Code Reviews** - Reward developers for completing code reviews
- **Training Completion** - Reward employees for completing training modules
- **Goal Achievement** - Reward for meeting KPIs or milestones

## API Reference

### Send Reward

Send sats to a user as a reward.

```
POST /api/sendReward
```

#### Authentication

The API uses Basic Authentication combined with query parameters:

- **Authorization Header**: `Basic base64(username:password)` - LNbits credentials
- **Query Parameters**:
  - `siteURL` - Your LNbits instance URL
  - `adminkey` - Admin API key for the host wallet

#### Request Body

```json
{
  "recipientUserId": "string",    // Required: LNbits user ID of the recipient
  "amount": 100,                  // Required: Amount in sats to send
  "reason": "timesheet_completed",// Required: Reason category
  "message": "Great job!",        // Optional: Custom message
  "metadata": {                   // Optional: Additional context
    "source": "power_automate",
    "ticketId": "TICKET-123"
  }
}
```

#### Reason Categories

| Reason | Description |
|--------|-------------|
| `timesheet_completed` | User completed their timesheet |
| `sla_met` | Support ticket SLA was met |
| `daily_standup` | Attended daily standup meeting |
| `code_review` | Completed a code review |
| `training_completed` | Completed training module |
| `goal_achieved` | Met a KPI or milestone |
| `peer_recognition` | Recognized by a peer |
| `milestone_reached` | Reached a project milestone |
| `custom` | Custom reason (use message field) |

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Successfully sent 100 sats to user",
  "transactionId": "abc123...",
  "recipient": "user-id-123",
  "amount": 100,
  "reason": "timesheet_completed",
  "timestamp": "2024-12-16T10:30:00.000Z"
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Error description",
  "timestamp": "2024-12-16T10:30:00.000Z"
}
```

### Get Users

List all users in the system.

```
GET /api/getUsers
```

#### Authentication

Same as Send Reward endpoint.

#### Response

Returns an array of user objects with their wallet information.

## Integration Examples

### Power Automate / Logic Apps

1. Add an HTTP action
2. Configure the request:
   - Method: `POST`
   - URI: `https://your-function-app.azurewebsites.net/api/sendReward?siteURL=https://your-lnbits.com&adminkey=your-admin-key`
   - Headers:
     - `Authorization`: `Basic <base64-encoded-credentials>`
     - `Content-Type`: `application/json`
   - Body:
     ```json
     {
       "recipientUserId": "@{triggerBody()?['userId']}",
       "amount": 50,
       "reason": "timesheet_completed",
       "message": "Thanks for submitting your timesheet on time!"
     }
     ```

### cURL Example

```bash
curl -X POST "https://your-function-app.azurewebsites.net/api/sendReward?siteURL=https://your-lnbits.com&adminkey=your-admin-key" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserId": "user-123",
    "amount": 100,
    "reason": "goal_achieved",
    "message": "Congratulations on reaching your target!"
  }'
```

### JavaScript/TypeScript

```typescript
async function sendReward(userId: string, amount: number, reason: string) {
  const credentials = btoa(`${username}:${password}`);

  const response = await fetch(
    `${functionAppUrl}/api/sendReward?siteURL=${lnbitsUrl}&adminkey=${adminKey}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientUserId: userId,
        amount: amount,
        reason: reason,
        message: 'Reward for your great work!'
      })
    }
  );

  return await response.json();
}
```

### Python

```python
import requests
import base64

def send_reward(user_id: str, amount: int, reason: str):
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()

    response = requests.post(
        f"{function_app_url}/api/sendReward",
        params={
            "siteURL": lnbits_url,
            "adminkey": admin_key
        },
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json"
        },
        json={
            "recipientUserId": user_id,
            "amount": amount,
            "reason": reason,
            "message": "Reward for your great work!"
        }
    )

    return response.json()
```

## Setup

### Prerequisites

- Node.js 18 or 20
- Azure Functions Core Tools (for local development)
- LNbits instance (v1.0+)
- Azure account (for deployment)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/knowall-ai/zaplie-customaction.git
   cd zaplie-customaction
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with LNbits credentials

5. Start the function app:
   ```bash
   cd functions
   npm start
   ```

6. Test the API at `http://localhost:7071/api/sendReward`

### Deployment to Azure

1. Create an Azure Function App
2. Configure application settings with your environment variables
3. Deploy using Azure CLI or VS Code Azure Functions extension:
   ```bash
   cd functions
   func azure functionapp publish <your-function-app-name>
   ```

## Architecture

```
zaplie-customaction/
├── functions/                    # Azure Functions
│   ├── sendReward/              # Send reward endpoint
│   │   ├── function.json        # Function configuration
│   │   └── index.ts             # Handler implementation
│   ├── getUsers/                # Get users endpoint
│   ├── services/
│   │   ├── lnbitsService.ts     # LNbits API integration
│   │   ├── nostrWalletService.ts# Nostr Wallet Connect (NWC)
│   │   └── utils.ts             # Utility functions
│   └── types/
│       └── global.d.ts          # TypeScript definitions
├── .env.example                 # Environment template
├── package.json
└── README.md
```

## Wallet Integration

### LNbits (Primary)

The API uses LNbits for wallet management and Lightning payments. Each user has:
- **Allowance Wallet**: For sending rewards (managed/capped)
- **Private Wallet**: For receiving rewards (accumulates)

### Nostr Wallet Connect (Planned)

Support for Nostr Wallet Connect (NWC) is in development, enabling integration with:
- Alby
- Mutiny Wallet
- Any NWC-compatible wallet

## Security

- API key authentication required for all endpoints
- Basic Auth header with LNbits credentials
- Rate limiting recommended for production
- All transactions logged for audit trail

## License

MIT License - see [LICENSE](LICENSE) for details.

## Built by KnowAll AI

This project is developed and maintained by [KnowAll AI](https://www.knowall.ai).

For support, partnerships, or licensing inquiries, please reach out to us.

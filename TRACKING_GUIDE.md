# BC Deal Sizer - Access Tracking Guide

## 📊 How Tracking Works

The BC Deal Sizer automatically tracks every password access attempt with the following information:

### Data Captured on Each Access

When someone successfully enters the password and accesses the estimate, the system logs:

```javascript
{
  "contact": "Contact name (from URL param)",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "timestamp": 1694525400000,
  "time": "2024-09-17T10:30:00.000Z"
}
```

### What Each Field Means

- **contact** - The contact name passed in the URL (e.g., `?contact=John+Smith`)
- **ip** - The IP address of the person accessing the estimate
- **userAgent** - Browser and device information
- **timestamp** - Unix timestamp in milliseconds
- **time** - ISO 8601 formatted date/time for easy reading

## 🔍 How to View Access Logs

### Option 1: API Endpoint (Recommended for Automation)

**Endpoint:** `GET /api/logs`

**How to use:**

```bash
# Using curl (replace YOUR_ADMIN_KEY with actual key)
curl -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  http://localhost:3000/api/logs

# Or from JavaScript/Node.js
fetch('http://localhost:3000/api/logs', {
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_KEY'
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

**Response:**
```json
{
  "count": 3,
  "logs": [
    {
      "contact": "John Smith",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "timestamp": 1694525400000,
      "time": "2024-09-17T10:30:00.000Z"
    },
    ...
  ]
}
```

### Option 2: Server Console

Logs also print to the server console when accessed:

```
[ACCESS] John Smith @ 192.168.1.100 - 2024-09-17T10:30:00.000Z
[ACCESS] Jane Doe @ 203.0.113.45 - 2024-09-17T10:35:22.000Z
```

Watch these in real-time by running:

```bash
npm run dev
```

The console will show each access as it happens.

## 🔐 Admin Key Setup

The logs API requires authentication via an admin key.

### Default Admin Key

```
admin-key-change-me
```

**⚠️ IMPORTANT: Change this in production!**

### How to Set a Custom Admin Key

#### For Development (.env.local)

```bash
# .env.local
ADMIN_KEY=your-secure-admin-key-here
```

#### For Production (.env.production)

```bash
# .env.production
ADMIN_KEY=your-production-admin-key-very-secure
```

#### Docker/Deployment

Set as environment variable:

```bash
export ADMIN_KEY="your-super-secret-key"
npm start
```

### How to Use the Admin Key

Every request to `/api/logs` must include:

```bash
# Format: Bearer <YOUR_ADMIN_KEY>
curl -H "Authorization: Bearer your-secure-admin-key-here" \
  http://localhost:3000/api/logs
```

## 📋 Clearing Logs

To delete all access logs:

### API Endpoint: DELETE /api/logs

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  http://localhost:3000/api/logs
```

**Response:**
```json
{
  "message": "Cleared 5 log entries"
}
```

## 🌐 Passing Contact Information in URL

To track which prospect or contact accessed the estimate, add it to the URL:

### Format
```
http://localhost:3000?contact=John+Smith
```

### Examples

```
# Single contact
http://localhost:3000?contact=John+Smith

# With organization
http://localhost:3000?contact=John+Smith+from+Acme+Corp

# URL encoded
http://localhost:3000?contact=john%40acme.com

# Mobile friendly
http://your-domain.com/?contact=JSmith
```

### In Real Use

1. Generate the link with the contact's name
2. Share the link via email: `Send them: http://your-domain.com/?contact=John+Smith`
3. When they enter the password, the log will show "John Smith"
4. Check `/api/logs` later to confirm they accessed it

## 📈 Usage Examples

### Check Who Accessed an Estimate

```javascript
// Fetch logs with authentication
const response = await fetch('/api/logs', {
  headers: { 'Authorization': 'Bearer your-admin-key' }
});
const data = await response.json();

// Find accesses in the last hour
const oneHourAgo = Date.now() - (60 * 60 * 1000);
const recentAccesses = data.logs.filter(log => log.timestamp > oneHourAgo);

console.log(`Recent accesses: ${recentAccesses.length}`);
recentAccesses.forEach(log => {
  console.log(`${log.contact} from ${log.ip} at ${log.time}`);
});
```

### Build an Access Report

```javascript
// Group by contact
const byContact = {};
data.logs.forEach(log => {
  if (!byContact[log.contact]) {
    byContact[log.contact] = [];
  }
  byContact[log.contact].push(log);
});

// Print summary
Object.entries(byContact).forEach(([contact, accesses]) => {
  console.log(`${contact}: ${accesses.length} access(es)`);
  accesses.forEach(a => console.log(`  - ${a.time} from ${a.ip}`));
});
```

### Export Logs to CSV

```javascript
const response = await fetch('/api/logs', {
  headers: { 'Authorization': 'Bearer your-admin-key' }
});
const { logs } = await response.json();

// Convert to CSV
const csv = [
  'Contact,IP,Time,UserAgent',
  ...logs.map(l => 
    `"${l.contact}","${l.ip}","${l.time}","${l.userAgent.substring(0, 50)}..."`
  )
].join('\n');

// Download or save
console.log(csv);
```

## ⚠️ Important Limitations

### Current Implementation (Development)

- **In-Memory Storage**: Logs are stored in server memory
- **Lost on Restart**: All logs are deleted when the server restarts
- **Not Persistent**: Logs don't survive deployments
- **Single Server Only**: Logs aren't shared across multiple server instances

### For Production Use

**You MUST upgrade to a database:**

```javascript
// Example: Use a database like PostgreSQL
const logs = await db.query('SELECT * FROM access_logs');
```

Or use a service:
- **Vercel** → Use Vercel Analytics
- **MongoDB** → Store logs in a collection
- **Firebase** → Use Firestore
- **AWS** → Use CloudWatch or DynamoDB

## 🔄 Typical Tracking Workflow

### 1. Create & Send Estimate

```
You create an estimate for "John Smith at Acme Corp"
↓
Generate link: http://your-domain.com/?contact=John+Smith
↓
Send via email: "Here's your estimate: [link]"
```

### 2. Track Access

```
John opens the link
↓
Enters password: raven123
↓
System logs: {contact: "John Smith", ip: "203.0.113.45", ...}
↓
John views the estimate
```

### 3. Check Who Accessed

```
Later, check the logs:
curl -H "Authorization: Bearer your-admin-key" \
  http://localhost:3000/api/logs

Response shows:
- John Smith accessed on 2024-09-17 at 10:30 AM from 203.0.113.45
```

## 🛠️ Debugging

### Logs Not Appearing?

1. **Check the admin key**
   ```bash
   # Make sure you're using the correct key
   echo $ADMIN_KEY  # Should show your key
   ```

2. **Verify the URL parameter**
   ```
   # Make sure contact is in the URL
   http://localhost:3000?contact=TestUser
   ```

3. **Check console output**
   ```
   npm run dev
   # Look for [ACCESS] messages
   ```

4. **Test the API directly**
   ```bash
   curl http://localhost:3000/api/logs \
     -H "Authorization: Bearer your-admin-key"
   ```

## 📱 Share Links with Tracking

### Email Template

```
Subject: Your BC Deal Sizer Estimate

Hi {{FIRST_NAME}},

Here's your Business Central implementation estimate:

🔐 Access Link: 
http://your-domain.com/?contact={{FIRST_NAME}}+{{LAST_NAME}}

Password: [You'll provide this separately]

The estimate includes:
- Implementation effort breakdown
- Timeline and team sizing
- Risk assessment
- Support recommendations

Questions? Reply to this email.

Best regards,
[Your Name]
```

### Slack/Teams Template

```
Here's the estimate for {{contact}}:
http://your-domain.com/?contact={{CONTACT_NAME}}

Password in DM 🔒
```

## Summary

| Question | Answer |
|----------|--------|
| **What's tracked?** | Contact name, IP, browser, timestamp |
| **Where is it stored?** | In-memory (dev), needs DB (production) |
| **How to view?** | GET `/api/logs` with admin key |
| **How to pass contact?** | URL parameter: `?contact=Name` |
| **How to authenticate?** | Bearer token in Authorization header |
| **How long stored?** | Until server restart (dev only) |
| **Secure?** | Yes, requires admin key authorization |

For production, migrate logs to a database and set up automated retention policies.

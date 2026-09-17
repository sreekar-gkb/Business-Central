# BC Deal Sizer with Password Gate & Access Tracking

A secure Next.js React application with password-protected access and full visitor logging.

## Features

✓ React password gate component  
✓ Automatic access logging (timestamp, contact, IP, user agent)  
✓ Admin API endpoint to view all logs  
✓ Local development with Next.js  
✓ One-click deployment to Vercel  
✓ No database needed (in-memory logs)  

---

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

**Test credentials:**
- Password: `testpass123`
- Admin key: `admin123`

### 3. Test Password Gate

1. Enter wrong password → See error
2. Enter `testpass123` → Access granted
3. See the placeholder artifact

### 4. Test Logging

In a new terminal, check the access logs:

```bash
curl -H "Authorization: Bearer admin123" \
  http://localhost:3000/api/logs
```

Returns:
```json
{
  "count": 1,
  "logs": [
    {
      "contact": "Anonymous",
      "time": "2024-09-17T14:32:45.123Z",
      "ip": "::1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": 1726579965123
    }
  ]
}
```

### 5. Test with Contact Name

Open: http://localhost:3000/?contact=SRC

Then check logs again — you'll see `contact: "SRC"` instead of "Anonymous".

---

## Deploy to Vercel

### Step 1: Create Git Repo

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/bc-deal-sizer-gate.git
git push -u origin main
```

### Step 2: Connect to Vercel

```bash
npm install -g vercel
vercel login
vercel link
```

### Step 3: Set Environment Variables

In Vercel dashboard:

1. Go to **Settings > Environment Variables**
2. Add:
   - `VIEW_PASSWORD` = Your secure password
   - `ADMIN_KEY` = Your secure admin key
3. Save

### Step 4: Deploy

```bash
npm run build
vercel --prod
```

Or just push to GitHub and Vercel auto-deploys on main branch.

---

## Usage

### Share the Artifact Link

```
https://your-project.vercel.app/?contact=SRC
```

Users enter the password to unlock it.

The `?contact=SRC` parameter labels who accessed it.

### View Access Logs

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  https://your-project.vercel.app/api/logs
```

### Clear Logs

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  https://your-project.vercel.app/api/logs
```

---

## File Structure

```
bc-deal-sizer-react/
├── pages/
│   ├── index.js              # Main page (password gate logic)
│   └── api/
│       ├── auth.js           # Password verification endpoint
│       └── logs.js           # Admin logs endpoint
├── components/
│   ├── PasswordGate.js       # React password component
│   └── ArtifactContent.js    # Content display component
├── lib/
│   └── logs.js               # Shared logs storage
├── styles/
│   ├── globals.css           # Global styles
│   ├── Home.module.css       # Home page styles
│   ├── PasswordGate.module.css
│   └── ArtifactContent.module.css
├── public/                   # Static assets (favicon, etc)
├── .env.local               # Local env vars (for testing)
├── .env.example             # Template
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## Customization

### Change the Artifact Content

Edit `components/ArtifactContent.js` and replace the placeholder with your actual content:

```javascript
export default function ArtifactContent() {
  return (
    <div className={styles.contentContainer}>
      {/* Replace this with your artifact */}
      <YourActualComponent />
    </div>
  );
}
```

### Change Styling

- Global styles: `styles/globals.css`
- Component styles: `styles/PasswordGate.module.css`, etc.

### Change Passwords

Edit `.env.local` (local) or Vercel dashboard (production):

```
VIEW_PASSWORD=YourNewPassword
ADMIN_KEY=YourNewAdminKey
```

---

## Troubleshooting

### "localhost:3000 is already in use"

```bash
# Kill the process or use a different port
npm run dev -- -p 3001
```

### Changes not showing

Restart the dev server:
```bash
# Press Ctrl+C in terminal, then:
npm run dev
```

### Wrong password error persists

- Check `.env.local` has correct `VIEW_PASSWORD`
- Restart dev server
- Clear browser cache (Ctrl+Shift+Delete)

### Can't see logs

- Check admin key in curl command matches `ADMIN_KEY` in `.env.local`
- Make sure the app has been accessed at least once
- Authorization header format: `Bearer YOUR_ADMIN_KEY`

### Deploy to Vercel failed

- Make sure `.gitignore` includes `node_modules` and `.env`
- Check `package.json` scripts are correct
- Verify `next.config.js` exists
- Check GitHub repo is public or Vercel has access

---

## Development Tips

### Add new API endpoint

Create `pages/api/myendpoint.js`:

```javascript
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello' });
}
```

Access at: http://localhost:3000/api/myendpoint

### Use the logs storage in other endpoints

```javascript
import { addLog, getLogs } from '../../lib/logs';

// In your API route:
getLogs(); // Get all logs
addLog({ contact: 'User', ip: '192.168.1.1', userAgent: 'Safari' }); // Add a log
```

### Pass data between components

Use React `useState` hook:

```javascript
const [unlocked, setUnlocked] = useState(false);
// Pass to child
<PasswordGate onUnlock={() => setUnlocked(true)} />
```

---

## Production Checklist

- [ ] Changed `VIEW_PASSWORD` to something secure
- [ ] Changed `ADMIN_KEY` to something secure
- [ ] Replaced placeholder artifact with actual content
- [ ] Tested locally with `npm run dev`
- [ ] Deployed to Vercel with `vercel --prod`
- [ ] Set environment variables in Vercel dashboard
- [ ] Tested password gate on production URL
- [ ] Tested logs endpoint on production URL
- [ ] Shared link with SRC in format: `https://your-url.vercel.app/?contact=SRC`

---

## Next Steps

1. **Embed your artifact:** Replace `ArtifactContent.js` placeholder
2. **Add a database:** Replace in-memory logs with Supabase or MongoDB
3. **Send email alerts:** Notify you when someone accesses it
4. **Custom domain:** Add your domain in Vercel settings
5. **Multiple artifacts:** Create separate projects for different deals

---

## Support

- Check Vercel logs: `vercel logs --prod`
- Check browser console: F12 → Console tab
- Verify `.env.local` exists with correct values

---

**Built for Raven Labs** | BC Deal Sizer Pre-Sales Estimation Tool

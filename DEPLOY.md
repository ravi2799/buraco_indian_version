# Deploying Buraco to Render (Free)

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `buraco-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**
6. Wait for deploy - copy the URL (e.g., `https://buraco-backend.onrender.com`)

### 3. Deploy Frontend on Render

1. Click **New** → **Static Site**
2. Connect the same GitHub repo
3. Configure:
   - **Name**: `buraco-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: (leave empty)
   - **Publish Directory**: `.`
4. Click **Create Static Site**

### 4. Update Frontend Config

Edit `frontend/config.js` and set your backend URL:
```javascript
window.BACKEND_URL = 'https://buraco-backend.onrender.com';
```

Then push the change:
```bash
git add frontend/config.js
git commit -m "Update backend URL for production"
git push
```

### 5. Play!

Share your frontend URL with friends:
`https://buraco-frontend.onrender.com`

---

## Notes

- **Free tier**: Backend sleeps after 15 min of inactivity. First request takes ~30s to wake up.
- **Upgrade**: For always-on, upgrade to Render's paid tier ($7/month).

## Alternative: Railway

Railway offers $5 free credit monthly and doesn't sleep:

```bash
npm install -g @railway/cli
railway login
cd backend && railway init && railway up
```

Then deploy frontend to Netlify or Vercel for free.

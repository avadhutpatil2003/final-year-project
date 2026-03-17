# 🔧 Troubleshooting Google Maps API

## ❌ Current Error:
```
Google Maps JavaScript API error: InvalidKeyMapError
ℹ️ Using OpenStreetMap (Leaflet) - No Google Maps API key found
```

---

## ✅ Solution: Restart Application

### The Problem:
React environment variables (`.env` file) are loaded **only when the application starts**. Changes to `.env` require a restart.

### The Fix:
```bash
# 1. Stop the current server
Press: Ctrl + C (or Cmd + C on Mac)

# 2. Start again
npm start
```

---

## 🔍 Step-by-Step Verification:

### Step 1: Verify .env File
```bash
cat .env
```

**Expected output:**
```
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBPjvI0ctJBNDWqvKZ5CJcmtgCnZiqkyJQ
```

✅ If you see this, the file is correct!

---

### Step 2: Restart Application
```bash
# Stop current server (Ctrl+C)
# Then start:
npm start
```

---

### Step 3: Check Browser Console
After restart, open browser console (F12) and look for:

**✅ Success Messages:**
```
🔑 Google Maps API Key: Found
🗺️ USE_GOOGLE_MAPS: true
✅ Google Maps enabled - Loading...
🔑 API Key present: AIzaSyBPjv...
✅ Google Maps loaded successfully
🗺️ Initializing Google Map...
✅ Map initialized successfully
```

**❌ Error Messages (if still failing):**
```
⚠️ Google Maps disabled - API key not found or invalid
📝 Please check .env file has: REACT_APP_GOOGLE_MAPS_API_KEY=your_key
🔄 After updating .env, restart the app: Ctrl+C then npm start
```

---

## 🎯 Quick Test:

After restart:
1. Go to **Supervisors** page
2. Click **purple location button** (📍)
3. Modal should open with **Google Maps** (not OpenStreetMap)
4. Click **"Add Test Data"** button
5. You should see **red markers** on Google Maps

---

## 🐛 Still Not Working?

### Option 1: Hard Refresh Browser
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Option 2: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"

### Option 3: Check API Key in Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to: APIs & Services → Credentials
4. Verify API key: `AIzaSyBPjvI0ctJBNDWqvKZ5CJcmtgCnZiqkyJQ`
5. Check if **Maps JavaScript API** is enabled
6. Check if there are any restrictions on the key

### Option 4: Verify Environment Variable is Loaded
Add this temporarily to `src/App.js`:
```javascript
console.log('ENV CHECK:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
```

Should output:
```
ENV CHECK: AIzaSyBPjvI0ctJBNDWqvKZ5CJcmtgCnZiqkyJQ
```

---

## 📋 Checklist:

- [ ] `.env` file exists in project root
- [ ] `.env` contains: `REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBPjvI0ctJBNDWqvKZ5CJcmtgCnZiqkyJQ`
- [ ] Application restarted (Ctrl+C then `npm start`)
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Console shows "Google Maps API Key: Found"
- [ ] Console shows "USE_GOOGLE_MAPS: true"
- [ ] No "InvalidKeyMapError" in console
- [ ] Map shows Google Maps (not OpenStreetMap)

---

## 🎉 Success Indicators:

### In Browser Console:
```
✅ 🔑 Google Maps API Key: Found
✅ 🗺️ USE_GOOGLE_MAPS: true
✅ Google Maps loaded successfully
✅ Map initialized successfully
```

### In UI:
- ✅ Google Maps tiles (not OpenStreetMap)
- ✅ Google logo in bottom-left corner
- ✅ Red markers with numbers
- ✅ Smooth map interaction
- ✅ No error messages

---

## 💡 Important Notes:

### Environment Variables in React:
1. Must start with `REACT_APP_`
2. Loaded at **build time** (not runtime)
3. Require **restart** to pick up changes
4. Cannot be changed without restart

### Why Restart is Required:
- React uses Webpack to bundle your app
- Environment variables are injected during build
- Hot reload doesn't update environment variables
- Must stop and start the dev server

---

## 🚀 Final Steps:

```bash
# 1. Stop server
Ctrl + C

# 2. Verify .env file
cat .env

# 3. Start server
npm start

# 4. Open browser
http://localhost:3000

# 5. Go to Supervisors page
# 6. Click purple location button (📍)
# 7. Should see Google Maps!
```

---

**Please restart your application now to see Google Maps working! 🗺️**

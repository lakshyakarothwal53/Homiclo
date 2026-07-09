# Quick Start Guide - Employee Geofenced Attendance System

## 🚀 Get Started in 5 Minutes

### Step 1: Load Database Schema (2 min)

Open Supabase Dashboard → SQL Editor and run these files in order:

1. **Copy & Run**: `supabase/attendance/04_employee_geofence.sql`
   - Creates tables, functions, indexes
   
2. **Copy & Run**: `supabase/attendance/05_employee_geofence_seed.sql`
   - Populates sample data (7 offices, 30 check-ins, 10 employee summaries)
   
3. **Copy & Run**: `supabase/attendance/06_employee_geofence_rls.sql`
   - Enables security policies

### Step 2: Build & Start Dev Server (2 min)

```bash
cd "c:\Users\HP\Downloads\homoclo git\Homiclo"
npm install        # if needed
npm run build      # verify build ✅
npm run dev        # start dev server
```

### Step 3: Test the System (1 min)

1. Open http://localhost:5173/login
2. Select **Employee** role (or scroll down to find it)
3. Enter credentials:
   - **Email**: `emp001@homiqlo.co`
   - **Password**: `emp123`
4. Click "Sign in"
5. You'll be redirected to your dashboard

### Step 4: Mark Your First Attendance (optional)

1. Click "Attendance" → "My Check-in" (or visit `/attendance/employee-checkin`)
2. Click "Capture My Location" button
3. Allow browser to access your location
4. If within 50m of office → Green checkmark ✓
5. Click "Check In" button
6. See your check-in in today's table
7. View monthly summary in right sidebar

---

## 📱 Available Employee Credentials

All employees use password: **emp123**

| # | Email | Name | Branch |
|---|-------|------|--------|
| 1 | emp001@homiqlo.co | Rahul Sharma | Main Store |
| 2 | emp002@homiqlo.co | Priya Patel | Main Store |
| 3 | emp003@homiqlo.co | Amit Singh | Main Store |
| 4 | emp004@homiqlo.co | Sneha Gupta | Branch 2 |
| 5 | emp005@homiqlo.co | Vikram Rao | Branch 2 |
| ... | emp006-emp052@homiqlo.co | ... | Various |

**Total**: 52 employee accounts available

---

## 🗺️ Office Locations (Geofence Demo)

All offices have 50-meter geofence. GPS coordinates:

| Office | Latitude | Longitude | Address |
|--------|----------|-----------|---------|
| Mumbai HQ | 19.0760 | 72.8777 | Mumbai |
| Main Store | 19.0827 | 72.8857 | Andheri |
| Branch 2 | 19.1136 | 72.8697 | Thane |
| Branch 3 | 19.0176 | 72.9781 | Airoli |
| Worli | 19.0176 | 72.8194 | Worli |
| Bandra | 19.0596 | 72.8295 | Bandra |
| Warehouse | 19.2183 | 72.9781 | Navi Mumbai |

---

## ✨ Key Features

### 1. GPS Location Verification
- ✅ Browser geolocation API
- ✅ Real-time distance calculation
- ✅ 50-meter geofence validation

### 2. Attendance Marking
- ✅ Check-In button (green, enabled if inside geofence)
- ✅ Check-Out button (orange, enabled after check-in)
- ✅ Real-time status feedback

### 3. Monthly Report
- ✅ Attendance percentage
- ✅ Working days / Present / Absent / Late
- ✅ Auto-updates as you check in

---

## 🧪 Test Scenarios

### Scenario 1: Successful Check-In
```
1. Login as emp001
2. Click "Capture My Location"
3. Allow GPS access
4. See distance from office
5. If < 50m, click "Check In"
6. ✓ Check-in recorded in table
```

### Scenario 2: Geofence Blocked
```
1. If you're far from office (>50m)
2. System shows red error message
3. "Check In" button is disabled
4. Message: "You are Xm outside the office premises"
5. ✓ System correctly blocked attendance
```

### Scenario 3: Multiple Check-Ins
```
1. Check in (morning)
2. Later, click "Check Out"
3. Both times appear in today's table
4. Monthly summary updated
```

---

## 📊 What You'll See

### Employee Dashboard
```
┌─────────────────────────────────────────┐
│ GPS Location Verification               │
│ ┌──────────────────────────────────────┐│
│ │ Select Office: Main Store ▼           ││
│ │ [Capture My Location] (loading...)    ││
│ │ Coordinates: 19.0827, 72.8857         ││
│ │ Distance: 15.2m away                  ││
│ │ ✓ Inside geofence (green)             ││
│ ├──────────────────────────────────────┤│
│ │ [Check In] [Check Out]                ││
│ └──────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ Today's Check-ins                       │
│ │ 09:05 AM │ check-in │ ✓ Verified │ 15.2m ││
│ │ 06:15 PM │ check-out│ ✓ Verified │ 14.8m ││
├─────────────────────────────────────────┤
│ Monthly Summary (Right Sidebar)         │
│ Attendance: 90.9%                       │
│ Working Days: 22                        │
│ Present: 20  Absent: 1  Late: 1         │
└─────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### "Location Not Captured"
- Enable location services on your device
- Check browser permissions
- Use HTTPS (required for geolocation)
- Try incognito window

### "Invalid Email or Password"
- Verify email: emp001@homiqlo.co (case-insensitive)
- Password: emp123 (exactly)
- Clear cookies and try again

### "Check In Button Disabled"
- Ensure location was captured
- Ensure you're within 50m of office
- Check error message for distance

### "Monthly Summary Empty"
- Refresh page
- Ensure at least one check-in recorded
- Wait 1-2 seconds for cache update

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `GEOFENCE_ATTENDANCE_GUIDE.md` | Complete system documentation |
| `supabase/attendance/README_GEOFENCE.md` | Database setup & config |
| `IMPLEMENTATION_SUMMARY.md` | What was built & tested |
| `QUICK_START.md` | This file - get started fast |

---

## 🎯 What's Working

- ✅ 52 individual employee login accounts
- ✅ GPS-based attendance marking (50m geofence)
- ✅ Real-time geofence validation
- ✅ Monthly attendance calculation
- ✅ Check-in/check-out functionality
- ✅ Today's attendance history
- ✅ Monthly summary dashboard
- ✅ Build passes (npm run build)
- ✅ Database schema ready
- ✅ Sample data pre-loaded

---

## 🚀 Next Steps

1. [ ] Run SQL files (04, 05, 06) in Supabase
2. [ ] Build project: `npm run build`
3. [ ] Start dev server: `npm run dev`
4. [ ] Login as emp001@homiqlo.co / emp123
5. [ ] Visit /attendance/employee-checkin
6. [ ] Capture location & mark attendance
7. [ ] View monthly summary

**Time to first check-in: ~5 minutes** ⏱️

---

## 💡 Pro Tips

- Try logging in as different employees (emp002, emp003, etc.)
- Each employee sees only their own data
- Monthly summary updates automatically
- GPS distance is in meters (accurate to ~0.5%)
- Geofence can be changed in database (default 50m)
- Check browser console for debug info

---

## 📞 Support

Need help? Check:
1. `QUICK_START.md` - This guide
2. `GEOFENCE_ATTENDANCE_GUIDE.md` - Full documentation
3. `supabase/attendance/README_GEOFENCE.md` - Database help
4. Browser console - Error messages

---

**Ready?** Let's go! 🚀

# Employee Geofenced Attendance Management System

## Overview

This document describes the complete Employee Attendance Management System with geofencing capabilities implemented in HOMIQLO. The system allows employees to mark their attendance using GPS location verification with a 50-meter office geofence.

## Features Implemented

### 1. Individual Employee Login System
- **50+ Employee Accounts**: Each employee has unique credentials (email + password)
- **Personalized Dashboards**: Employees only see their own attendance data
- **Role-Based Access**: Employees use the "employee" role to access the system

### 2. Location-Based Attendance Marking (Geofencing)
- **GPS Capture**: Employees must allow location access to mark attendance
- **50-Meter Geofence**: Attendance is only allowed within 50 meters of office coordinates
- **Distance Calculation**: Uses Haversine formula for accurate GPS distance calculation
- **Real-Time Feedback**: Employees see exact distance from office and geofence status

### 3. Monthly Attendance Report
- **Automatic Calculation**: Updates as employees mark attendance
- **Key Metrics**:
  - Total working days in the month
  - Total days present
  - Total days absent
  - Total late days
  - Total leave days
  - Overall attendance percentage

## Architecture

### Database Schema

#### New Tables Created:

**1. `office_locations`** - Stores office GPS coordinates
```sql
- id (UUID primary key)
- name (text) - Office name (e.g., "Mumbai HQ")
- branch (text, unique) - Branch code
- latitude (numeric) - Office latitude coordinate
- longitude (numeric) - Office longitude coordinate
- radius_meters (integer) - Geofence radius (default: 50m)
- address (text) - Physical address
```

**2. `employee_checkins`** - Individual employee check-ins with GPS
```sql
- id (UUID primary key)
- employee_id (text) - Employee identifier
- employee_name (text) - Employee full name
- branch (text) - Employee's branch
- check_date (text) - Date of check-in (YYYY-MM-DD)
- check_type (text) - 'check-in' or 'check-out'
- check_time (text) - Time of check-in
- latitude (numeric) - Employee's GPS latitude
- longitude (numeric) - Employee's GPS longitude
- geofence_verified (boolean) - Whether inside geofence
- distance_from_office_m (numeric) - Distance in meters
- geofence_error_message (text) - Error message if outside geofence
- status (text) - 'success', 'outside_geofence', or 'gps_error'
- notes (text) - Optional notes
```

**3. `employee_monthly_summary`** - Pre-computed monthly statistics
```sql
- id (UUID primary key)
- employee_id (text) - Employee identifier
- employee_name (text) - Employee full name
- branch (text) - Employee's branch
- year (integer) - Year
- month (integer) - Month (1-12)
- working_days (integer) - Total working days
- present_days (integer) - Days present
- absent_days (integer) - Days absent
- late_days (integer) - Days marked late
- leave_days (integer) - Days on approved leave
- attendance_percentage (text) - Calculated percentage
```

### Helper Functions

**`calculate_distance(lat1, lon1, lat2, lon2)`** - Haversine formula
- Calculates great-circle distance between two GPS points
- Returns distance in meters
- Implemented in PostgreSQL for accuracy

### React Hooks (src/hooks/use-attendance.ts)

```typescript
// Fetch office locations
useOfficeLocations(): Promise<OfficeLocation[]>

// Fetch employee's check-ins for a date
useEmployeeCheckins(employeeId: string, checkDate?: string): Promise<EmployeeCheckin[]>

// Fetch employee's monthly summary
useEmployeeMonthlySummary(employeeId: string, year?: number, month?: number): Promise<EmployeeMonthlySummary>

// Submit a new check-in
useSubmitEmployeeCheckin(): UseMutationResult

// Validate geofence (client-side)
validateGeofence(input: GeofenceCheckInput): GeofenceCheckResult

// Calculate distance (client-side helper)
calculateGeofenceDistance(empLat, empLon, officeLat, officeLon): number
```

## User Interface

### Employee Check-in Page
**Route**: `/attendance/employee-checkin`

#### Features:
1. **GPS Location Section**
   - Select office location dropdown
   - "Capture My Location" button
   - Displays captured coordinates
   - Shows real-time distance from office
   
2. **Geofence Validation**
   - Green alert if inside geofence ✓
   - Red alert if outside geofence ✗
   - Shows exact distance and error message
   
3. **Check-in/Check-out Buttons**
   - Green "Check In" button (enabled when location captured + inside geofence)
   - Orange "Check Out" button (enabled after check-in)
   - Disabled when conditions not met
   
4. **Today's Check-ins Table**
   - Shows all check-ins for today
   - Time, type, status, distance from office
   
5. **Monthly Summary Sidebar**
   - Attendance percentage (large)
   - Working days, present, absent, late, leave (cards)
   - Updates automatically as new check-ins are recorded

## Employee Login Credentials

### Sample Employee Accounts (Password: same for all demo accounts)
All demo employees use password: `emp123` (when hashed to SHA256)

| Email | Name | Branch | Employee ID |
|-------|------|--------|-------------|
| emp001@homiqlo.co | Rahul Sharma | Main Store | EMP001 |
| emp002@homiqlo.co | Priya Patel | Main Store | EMP002 |
| emp003@homiqlo.co | Amit Singh | Main Store | EMP003 |
| emp004@homiqlo.co | Sneha Gupta | Branch 2 | EMP004 |
| emp005@homiqlo.co | Vikram Rao | Branch 2 | EMP005 |
| emp006@homiqlo.co | Anjali Desai | Main Store | EMP006 |
| ... | ... | ... | ... |
| emp052@homiqlo.co | Sneha Reddy | Main Store | EMP052 |

**Total Employees**: 52 individual accounts (EMP001 - EMP052)

## Office Locations Configuration

Pre-configured office locations with 50m geofence:

| Branch | Latitude | Longitude | Address |
|--------|----------|-----------|---------|
| Mumbai HQ | 19.0760 | 72.8777 | Mumbai, Maharashtra |
| Worli | 19.0176 | 72.8194 | Worli, Mumbai |
| Bandra | 19.0596 | 72.8295 | Bandra, Mumbai |
| Main Store | 19.0827 | 72.8857 | Andheri, Mumbai |
| Branch 2 | 19.1136 | 72.8697 | Thane, Maharashtra |
| Branch 3 | 19.0176 | 72.9781 | Airoli, Navi Mumbai |
| Warehouse | 19.2183 | 72.9781 | Navi Mumbai, Maharashtra |

## Data Flow

### Check-in Process:
```
1. Employee navigates to /attendance/employee-checkin
2. Selects office location (defaults to their branch)
3. Clicks "Capture My Location" button
   → Browser requests GPS access
   → Gets latitude/longitude from navigator.geolocation
4. System calculates distance using Haversine formula
5. Employee sees geofence status (inside/outside)
6. If inside geofence:
   - Employee clicks "Check In" or "Check Out"
   - System submits to employee_checkins table
   - Status marked as "success"
   - Distance recorded in database
7. If outside geofence:
   - Check-in button disabled
   - Error message shown with distance
   - User must move closer to office
```

### Monthly Summary Update:
```
1. Each night (or on-demand):
   - Aggregate employee_checkins for the month
   - Calculate:
     - Working days (exclude weekends)
     - Present days (days with successful check-ins)
     - Absent days (working days with no check-in)
     - Late days (check-in after grace period)
     - Leave days (marked in system)
     - Attendance % = (present_days / working_days) * 100
2. Update employee_monthly_summary table
3. React query cache invalidated
4. Employee dashboard automatically refreshes
```

## Geofence Validation Logic

### Haversine Formula Implementation:
```javascript
const R = 6371000; // Earth radius in meters

function calculateGeofenceDistance(empLat, empLon, officeLat, officeLon) {
  const phi1 = (empLat * Math.PI) / 180;
  const phi2 = (officeLat * Math.PI) / 180;
  const deltaPhi = ((officeLat - empLat) * Math.PI) / 180;
  const deltaLambda = ((officeLon - empLon) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
}
```

### Validation Rules:
1. Employee's distance ≤ office radius (50m) → **ALLOWED**
2. Employee's distance > office radius → **BLOCKED**
3. GPS error or no location → **BLOCKED**

## Security & RLS Policies

### Row Level Security (RLS)
- **office_locations**: Public read (no login required)
- **employee_checkins**: Employees can only see/insert their own check-ins
- **employee_monthly_summary**: Employees can only view their own summary

### Demo-Grade Policies (Production Improvements Needed):
```sql
-- TODO: Implement proper authentication checks
-- Currently allows all authenticated users for demo purposes
-- Production should verify:
-- - User UID matches employee_id
-- - User has "employee" role
-- - User can only access their own data
```

## Database Setup (SQL Execution Order)

Run these SQL files in Supabase dashboard in this order:

1. `supabase/attendance/04_employee_geofence.sql` - Create tables & functions
2. `supabase/attendance/05_employee_geofence_seed.sql` - Seed data
3. `supabase/attendance/06_employee_geofence_rls.sql` - Enable RLS policies

## Frontend Components

### Main Component: `src/routes/_app/attendance/employee-checkin.tsx`
- Full-featured employee dashboard
- Real-time geofence validation
- Monthly summary display
- Check-in/check-out functionality

### Updated Types: `src/types/attendance.ts`
```typescript
interface OfficeLocation {
  id: string;
  name: string;
  branch: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address?: string;
}

interface EmployeeCheckin {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  checkDate: string;
  checkType: "check-in" | "check-out";
  checkTime: string;
  latitude?: number;
  longitude?: number;
  geofenceVerified: boolean;
  distanceFromOfficeM?: number;
  geofenceErrorMessage?: string;
  status: "success" | "outside_geofence" | "gps_error";
  notes?: string;
}

interface EmployeeMonthlySummary {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  year: number;
  month: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendancePercentage: string;
}
```

## Testing the System

### Step 1: Login as Employee
1. Go to `/login`
2. Select "Employee" role
3. Email: `emp001@homiqlo.co`
4. Password: `emp123`
5. Click "Sign in"

### Step 2: Navigate to Check-in
1. Click on sidebar "Attendance" → "My Check-in"
2. Or visit `/attendance/employee-checkin`

### Step 3: Test Geofence
1. Click "Capture My Location" (allow browser GPS access)
2. Browser will request location
3. System will show:
   - Your coordinates
   - Office coordinates
   - Distance in meters
   - Geofence status
4. If within 50m → Check In button enabled
5. If outside 50m → Check In button disabled + error message

### Step 4: Test Check-in
1. Ensure you're within geofence
2. Click "Check In" button
3. System records check-in with:
   - Timestamp
   - GPS coordinates
   - Geofence verification
   - Distance
4. View check-in in "Today's Check-ins" table

### Step 5: View Monthly Summary
1. Look at right sidebar
2. See updated statistics:
   - Attendance percentage
   - Working days
   - Days present/absent/late/leave

## Production Deployment Checklist

- [ ] Update office location coordinates to real office GPS
- [ ] Change geofence radius from 50m to desired distance
- [ ] Implement proper Supabase authentication (replace mock auth)
- [ ] Add RLS policies verification for employee_id matching
- [ ] Add role-based access control (employees vs managers)
- [ ] Implement audit logging for all check-ins
- [ ] Add manager view to see team attendance
- [ ] Implement leave request workflow
- [ ] Add late policy enforcement
- [ ] Set up automated monthly report generation
- [ ] Add biometric/photo verification option
- [ ] Configure timezone handling for multi-location offices
- [ ] Add notification system for missed check-ins
- [ ] Implement geofence "allowed zones" (not just offices)

## API Reference

### useEmployeeCheckins(employeeId, checkDate?)
```typescript
const { data, isLoading, error } = useEmployeeCheckins("EMP001", "2026-07-06");
// Returns: EmployeeCheckin[]
```

### useEmployeeMonthlySummary(employeeId, year?, month?)
```typescript
const { data } = useEmployeeMonthlySummary("EMP001");
// Returns: EmployeeMonthlySummary | null
// Defaults to current month/year
```

### useSubmitEmployeeCheckin()
```typescript
const submit = useSubmitEmployeeCheckin();
await submit.mutateAsync({
  employeeId: "EMP001",
  employeeName: "Rahul Sharma",
  branch: "Main Store",
  checkDate: "2026-07-06",
  checkType: "check-in",
  checkTime: "09:05 AM",
  latitude: 19.0827,
  longitude: 72.8857,
  geofenceVerified: true,
  distanceFromOfficeM: 15.2,
  status: "success"
});
```

### validateGeofence(input)
```typescript
const result = validateGeofence({
  employeeId: "EMP001",
  employeeName: "Rahul Sharma",
  branch: "Main Store",
  latitude: 19.0827,
  longitude: 72.8857,
  checkType: "check-in",
  officeLocation: officeData // OfficeLocation object
});
// Returns: { isWithinGeofence: boolean, distanceM: number, errorMessage?: string }
```

## Troubleshooting

### GPS Location Not Captured
- **Issue**: Browser says "Location not captured"
- **Solution**: 
  - Ensure location services are enabled on device
  - Check browser permissions for location
  - Use HTTPS (required for geolocation)
  - Clear browser cache and try again

### Geofence Validation Shows Wrong Distance
- **Issue**: Distance calculation seems off
- **Solution**:
  - Haversine formula has ~0.5% error due to Earth's ellipsoid
  - For accurate results within 50m, consider using other methods
  - Check office coordinates are correct in database

### Monthly Summary Not Updating
- **Issue**: Summary shows old data after check-in
- **Solution**:
  - React Query cache invalidation should update automatically
  - Try page refresh
  - Check browser console for errors
  - Verify check-in was successfully recorded in database

### Employee Can't Login
- **Issue**: "Invalid email or password"
- **Solution**:
  - Verify email is correct (case-insensitive)
  - Check password is exactly `emp123`
  - Ensure employee account exists in users.json
  - Clear cookies and try again

## Performance Considerations

- Geofence calculations happen client-side (no server latency)
- Distance stored in database to avoid recalculation
- Monthly summaries pre-computed (not calculated on-demand)
- GPS coordinates stored as numeric for efficient distance queries
- Indexes on employee_id and check_date for fast lookups

## Future Enhancements

1. **Multi-Geofence Support**: Allow multiple office zones
2. **Automatic Late Detection**: Mark late based on check-in time
3. **Leave Integration**: Exclude leave days from absent count
4. **Manager Dashboard**: Aggregated team attendance
5. **Mobile App**: Native iOS/Android app
6. **Biometric Integration**: Fingerprint or face verification
7. **Photo Evidence**: Require photo with check-in
8. **Weather Integration**: Record weather during check-in
9. **Shift Management**: Different shifts with different hours
10. **Compliance Reports**: Generate GDPR/local compliance reports

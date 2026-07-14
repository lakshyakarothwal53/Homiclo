# Employee Geofence Attendance System - Setup Guide

## Overview
This folder contains SQL migrations for the Employee Attendance Management System with geofencing capabilities. The system enables employees to mark attendance using GPS location verification with a configurable geofence radius.

## File Execution Order

Run these SQL files in the **exact order** shown below in your Supabase SQL editor:

### Step 1: Create Schema and Functions
**File**: `04_employee_geofence.sql`

This creates:
- `office_locations` table - stores office GPS coordinates and geofence radius
- `employee_checkins` table - individual employee check-ins with GPS data
- `employee_monthly_summary` table - pre-computed monthly attendance statistics
- `calculate_distance()` PostgreSQL function - Haversine formula for GPS distance
- Database indexes for performance

**Action**: Copy entire contents of file and run in Supabase SQL editor

### Step 2: Seed Sample Data
**File**: `05_employee_geofence_seed.sql`

This populates:
- 7 office locations (Mumbai HQ, Worli, Bandra, Main Store, Branch 2, Branch 3, Warehouse)
- Sample check-ins for EMP001-EMP010 (current month: July 2026)
- Monthly summary statistics for all 10 employees

**Action**: Copy entire contents of file and run in Supabase SQL editor

### Step 3: Enable Row Level Security
**File**: `06_employee_geofence_rls.sql`

This enables:
- RLS on all new tables
- Read policy for office_locations (public read)
- Read/insert policies for employee_checkins
- Read policies for employee_monthly_summary

**Action**: Copy entire contents of file and run in Supabase SQL editor

## After Running SQL Files

### 1. Verify Tables Created
```sql
-- Check if tables exist
\dt office_locations
\dt employee_checkins
\dt employee_monthly_summary

-- Check if function exists
\df calculate_distance
```

### 2. Verify Sample Data
```sql
-- Check office locations
SELECT count(*) FROM office_locations;
-- Should return: 7

-- Check employee check-ins
SELECT count(*) FROM employee_checkins;
-- Should return: ~30 sample records

-- Check monthly summaries
SELECT count(*) FROM employee_monthly_summary;
-- Should return: 10 employees
```

### 3. Test Geofence Calculation
```sql
-- Test the distance function
-- Calculate distance between two Mumbai locations
SELECT calculate_distance(
  19.0827::numeric,  -- Employee latitude (Andheri)
  72.8857::numeric,  -- Employee longitude
  19.0760::numeric,  -- Office latitude (Bandra)
  72.8777::numeric   -- Office longitude
) as distance_meters;

-- Should return distance in meters (approximately 10-15 km depending on coordinates)
```

## Configuration

### Modify Office Locations
To add or update office locations:

```sql
-- Add new office location
INSERT INTO office_locations (name, branch, latitude, longitude, radius_meters, address)
VALUES ('New Office', 'New Branch', 19.0760, 72.8777, 50, 'Address here');

-- Update existing geofence radius
UPDATE office_locations 
SET radius_meters = 100 
WHERE branch = 'Main Store';
```

### Modify Geofence Radius
Default radius is 50 meters. To change:

```sql
-- Change radius for specific branch
UPDATE office_locations 
SET radius_meters = 75 
WHERE branch = 'Mumbai HQ';

-- Change all at once
UPDATE office_locations 
SET radius_meters = 100;
```

## Testing Data

### Sample Employees Already in System
After running seed SQL, these employees have check-in data:

| Employee ID | Name | Branch | Date |
|---|---|---|---|
| EMP001 | Rahul Sharma | Main Store | 2026-07-06 |
| EMP002 | Priya Patel | Main Store | 2026-07-06 |
| EMP003 | Amit Singh | Main Store | 2026-07-06 |
| EMP004 | Sneha Gupta | Branch 2 | 2026-07-06 |
| EMP005 | Vikram Rao | Branch 2 | 2026-07-06 |
| EMP006 | Anjali Desai | Main Store | 2026-07-06 |
| EMP007 | Rohan Verma | Branch 3 | 2026-07-06 |
| EMP008 | Deepak Kumar | Branch 3 | 2026-07-06 |
| EMP009 | Pooja Sharma | Main Store | 2026-07-06 |
| EMP010 | Arjun Singh | Main Store | 2026-07-06 |

### Check Sample Data
```sql
-- See all check-ins for EMP001
SELECT * FROM employee_checkins 
WHERE employee_id = 'EMP001' 
ORDER BY created_at DESC;

-- See monthly summary for EMP001
SELECT * FROM employee_monthly_summary 
WHERE employee_id = 'EMP001' 
AND year = 2026 
AND month = 7;

-- See which employees were outside geofence
SELECT employee_name, distance_from_office_m, geofence_error_message
FROM employee_checkins 
WHERE geofence_verified = false;
```

## Common Issues & Solutions

### Issue: Tables Already Exist
**Error**: `relation "office_locations" already exists`

**Solution**: 
- Use `DROP TABLE IF EXISTS office_locations CASCADE;` to remove old tables
- Or modify the SQL to use `CREATE TABLE IF NOT EXISTS` (already included)

### Issue: RLS Conflicts
**Error**: `relation has row security enabled but no policies exist`

**Solution**:
- Run step 3 (06_employee_geofence_rls.sql) to add RLS policies
- Or temporarily disable RLS for testing:
  ```sql
  ALTER TABLE employee_checkins DISABLE ROW LEVEL SECURITY;
  ```

### Issue: Function Already Exists
**Error**: `function calculate_distance already exists`

**Solution**:
- The SQL includes `CREATE OR REPLACE FUNCTION` which will update it
- If you get error, use: `DROP FUNCTION calculate_distance CASCADE;`

### Issue: Seed Data Conflicts
**Error**: `duplicate key value violates unique constraint`

**Solution**:
- Seed file includes `TRUNCATE ... CASCADE;` to clear tables first
- This is intentional - it resets to known state
- If you want to keep old data, comment out the TRUNCATE lines

## Production Deployment

### Before going live:

1. **Update Office Coordinates**
   ```sql
   UPDATE office_locations 
   SET latitude = 19.0760, longitude = 72.8777
   WHERE branch = 'Main Store';
   ```

2. **Adjust Geofence Radius**
   ```sql
   -- Change from demo 50m to production 100m
   UPDATE office_locations 
   SET radius_meters = 100;
   ```

3. **Implement Proper RLS**
   - Current policies allow all authenticated users
   - Update to verify `employee_id = auth.uid()`
   - See 06_employee_geofence_rls.sql for template

4. **Add Audit Logging**
   ```sql
   CREATE TABLE employee_checkins_audit (
     id uuid primary key default gen_random_uuid(),
     checkin_id uuid,
     changed_at timestamptz default now(),
     changed_by text,
     old_values jsonb,
     new_values jsonb
   );
   ```

5. **Set Up Triggers**
   - Auto-calculate monthly summaries when new check-ins added
   - Auto-mark late arrivals based on check-in time
   - Auto-update attendance percentage

6. **Enable Backups**
   - Ensure daily backups in Supabase dashboard
   - Test restore procedures

## Performance Tuning

### Indexes Already Created
```sql
create index if not exists idx_employee_checkins_employee_id on employee_checkins(employee_id);
create index if not exists idx_employee_checkins_check_date on employee_checkins(check_date);
create index if not exists idx_employee_checkins_branch on employee_checkins(branch);
create index if not exists idx_employee_monthly_summary_employee_id on employee_monthly_summary(employee_id);
create index if not exists idx_employee_monthly_summary_year_month on employee_monthly_summary(year, month);
create index if not exists idx_office_locations_branch on office_locations(branch);
```

### For High Volume (1000s of check-ins/day)
Consider adding:
```sql
-- For monthly summary queries
CREATE INDEX idx_employee_checkins_employee_check_date 
ON employee_checkins(employee_id, check_date);

-- For geofence verification queries
CREATE INDEX idx_employee_checkins_geofence_verified 
ON employee_checkins(geofence_verified, created_at DESC);
```

## Monitoring

### Monitor Table Sizes
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('office_locations', 'employee_checkins', 'employee_monthly_summary')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor RLS Performance
```sql
-- Queries take longer with RLS due to filter evaluation
-- Monitor slow queries in Supabase dashboard
```

## Support & Documentation

- **Main Guide**: See `GEOFENCE_ATTENDANCE_GUIDE.md` in project root
- **React Hooks**: See `src/hooks/use-attendance.ts`
- **Frontend Component**: See `src/routes/_app/attendance/employee-checkin.tsx`
- **Types**: See `src/types/attendance.ts`

## Rollback Procedure

If you need to remove geofence tables:

```sql
-- Drop tables (removes all data)
DROP TABLE IF EXISTS employee_monthly_summary CASCADE;
DROP TABLE IF EXISTS employee_checkins CASCADE;
DROP TABLE IF EXISTS office_locations CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS calculate_distance CASCADE;
```

**Warning**: This is destructive and removes all check-in data. Ensure you have backups first.

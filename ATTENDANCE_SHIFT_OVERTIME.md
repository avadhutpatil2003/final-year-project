# 🕐 Attendance Shift Hours & Overtime Calculation

## ✅ Current Implementation

### **Shift Hours Logic (Already Working!)**

Location: `src/pages/Attendance.jsx` (Lines 93-150)

---

## 📊 How It Works

### **Step 1: Get Company Shift Hours**

```javascript
// Line 93-105: getCompanyShiftHours()
const getCompanyShiftHours = (companyName) => {
  const company = companies.find(c => c.name === companyName);
  return company.shiftHours || company.shift || company.shiftDuration;
};
```

**Company data मधून shift hours घेतं:**
- `shiftHours: 8` → 8 hours shift
- `shiftHours: 12` → 12 hours shift

---

### **Step 2: Get Shift for Each Record**

```javascript
// Line 107-113: getShiftHoursForRecord()
const getShiftHoursForRecord = (record) => {
  return (
    record?.shiftHours ||           // Record मधून
    getCompanyShiftHours(record.companyName) ||  // Company मधून
    8  // Default fallback
  );
};
```

**Priority:**
1. Attendance record चं shiftHours
2. Company चं shiftHours  
3. Default: 8 hours

---

### **Step 3: Calculate Day Value**

```javascript
// Line 136-150: computeDayValue()
const computeDayValue = (record) => {
  const shiftHours = getShiftHoursForRecord(record);  // 8 or 12
  const workedHours = getWorkedHoursValue(record);    // Actual worked
  
  if (workedHours > shiftHours) {
    return 1.5;  // OVERTIME!
  }
  
  if (workedHours < shiftHours) {
    return 0.5;  // HALF DAY
  }
  
  return 1;  // FULL DAY
};
```

---

## 🔢 Calculation Examples

### **Example 1: 8 Hours Shift**

```
Company Shift: 8 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Case A: Worked 8 hours
  Result: 1.0 day ✅ (Full Day)

Case B: Worked 9 hours  
  Result: 1.5 days ✅ (Overtime)

Case C: Worked 10 hours
  Result: 1.5 days ✅ (Overtime)

Case D: Worked 6 hours
  Result: 0.5 day ✅ (Half Day)
```

### **Example 2: 12 Hours Shift**

```
Company Shift: 12 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Case A: Worked 12 hours
  Result: 1.0 day ✅ (Full Day)

Case B: Worked 13 hours
  Result: 1.5 days ✅ (Overtime)

Case C: Worked 14 hours
  Result: 1.5 days ✅ (Overtime)

Case D: Worked 8 hours
  Result: 0.5 day ✅ (Half Day)
```

---

## 📋 Attendance Table Display

### **Line 653-690: Table Columns**

```jsx
<thead>
  <tr>
    <th>Date</th>
    <th>Employee</th>
    <th>Company</th>
    <th>Shift Hours</th>  ← Company चं shift display
    <th>In Time</th>
    <th>Out Time</th>
    <th>Hours</th>         ← Worked hours
    <th>Day</th>           ← Calculated day value (0.5/1/1.5)
  </tr>
</thead>
```

### **Display Example:**

```
┌──────────────┬─────────────┬──────────┬────────┬─────────┬──────────┬────────┬──────┐
│ Date         │ Employee    │ Company  │ Shift  │ In Time │ Out Time │ Hours  │ Day  │
├──────────────┼─────────────┼──────────┼────────┼─────────┼──────────┼────────┼──────┤
│ 01/03/2025   │ Rohan       │ ABC Sec  │ 8h     │ 09:00   │ 17:00    │ 8h 0m  │ 1    │
│ 02/03/2025   │ Rohan       │ ABC Sec  │ 8h     │ 09:00   │ 18:30    │ 9h 30m │ 1.5  │
│ 03/03/2025   │ Rohan       │ XYZ Sec  │ 12h    │ 08:00   │ 20:00    │ 12h 0m │ 1    │
│ 04/03/2025   │ Rohan       │ XYZ Sec  │ 12h    │ 08:00   │ 22:00    │ 14h 0m │ 1.5  │
│ 05/03/2025   │ Rohan       │ ABC Sec  │ 8h     │ 09:00   │ 14:00    │ 5h 0m  │ 0.5  │
└──────────────┴─────────────┴──────────┴────────┴─────────┴──────────┴────────┴──────┘
```

---

## 📊 Summary Display (Lines 692-742)

```jsx
<div className="bg-white border rounded-lg p-4 mt-4">
  <h3>Summary</h3>
  <div className="grid grid-cols-5 gap-4">
    {/* Total Hours */}
    <div>
      <p>Total Hours</p>
      <p>{formattedHours}</p>  {/* e.g., "48h 30m" */}
    </div>
    
    {/* Total Days */}
    <div>
      <p>Total Days (Sum)</p>
      <p>{totalCalculatedDays.toFixed(2)}</p>  {/* e.g., "6.00" */}
    </div>
    
    {/* Overtime (1.5 day entries) */}
    <div>
      <p>1.5 Day Entries</p>
      <p>{overtimeDays}</p>  {/* Count of overtime days */}
    </div>
    
    {/* Full Days */}
    <div>
      <p>1 Day Entries</p>
      <p>{fullDays}</p>  {/* Count of full days */}
    </div>
    
    {/* Half Days */}
    <div>
      <p>0.5 Day Entries</p>
      <p>{halfDays}</p>  {/* Count of half days */}
    </div>
  </div>
  
  {/* Company Shift Hours */}
  <div className="mt-4">
    <span>Shift Hours ({selectedCompany}): {selectedShiftHoursLabel}</span>
  </div>
</div>
```

---

## 🎯 Complete Month Example

### **March 2025 - Rohan Jadhav**

```
Company A (8 hours shift):
─────────────────────────────────────
Day 1:  8h worked  = 1.0 day
Day 2:  9h worked  = 1.5 days  (OT)
Day 3:  8h worked  = 1.0 day
Day 4:  6h worked  = 0.5 day   (Half)
Day 5:  10h worked = 1.5 days  (OT)

Company B (12 hours shift):
─────────────────────────────────────
Day 6:  12h worked = 1.0 day
Day 7:  13h worked = 1.5 days  (OT)
Day 8:  12h worked = 1.0 day
Day 9:  9h worked  = 0.5 day   (Half)
Day 10: 14h worked = 1.5 days  (OT)

SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Records:     10
Total Hours:       101h 0m
Total Days:        11.0 days

Breakdown:
- Full Days (1.0):      4
- Overtime (1.5):       4
- Half Days (0.5):      2

Total = (4 × 1.0) + (4 × 1.5) + (2 × 0.5)
      = 4.0 + 6.0 + 1.0
      = 11.0 days ✅
```

---

## ✅ कसं Company Shift Set करायचं?

### **Company Form मध्ये:**

```javascript
Company Data:
{
  name: "ABC Security",
  shiftHours: 8,  // ← येथे 8 or 12
  // OR
  shift: "8 Hours",
  // OR  
  shiftDuration: 8
}
```

**Supported Fields:**
- `shiftHours: 8`
- `shiftHours: 12`
- `shift: "8 Hours"`
- `shift: "12 Hours"`

---

## 🔍 Important Notes

### **1. Shift Priority**
```
1st: record.shiftHours  (specific to that attendance)
2nd: company.shiftHours (from company data)
3rd: 8 hours (default)
```

### **2. Day Calculation Logic**
```javascript
if (worked > shift)  → 1.5 days (Overtime)
if (worked = shift)  → 1.0 day  (Full)
if (worked < shift)  → 0.5 day  (Half)
```

### **3. No Exact Match Required**
- 8.5 hours च्या 8 hours shift मध्ये = **1.5 days** (Overtime)
- 11 hours च्या 12 hours shift मध्ये = **0.5 day** (Half)

---

## 📝 Console Verification

Check browser console when viewing attendance:
```javascript
console.log("Company Shift:", getCompanyShiftHours(companyName));
console.log("Worked Hours:", getWorkedHoursValue(record));
console.log("Day Value:", computeDayValue(record));
```

---

## ✅ Status

**Feature:** ✅ **FULLY IMPLEMENTED**

- ✅ Company shift hours from company data
- ✅ Display in "Shift Hours" column  
- ✅ Overtime calculation (>shift = 1.5)
- ✅ Full day calculation (=shift = 1.0)
- ✅ Half day calculation (<shift = 0.5)
- ✅ Summary with breakdown
- ✅ Company-wise shift display

---

**Last Updated:** 18 December 2024  
**Feature:** Shift Hours & Overtime Calculation

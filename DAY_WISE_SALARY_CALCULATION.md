# 📅 Day-Wise Salary Calculation Logic

## ✅ Updated Calculation Method

### **Old Logic (Fixed 30-Day):**
```
Per Day Salary = Monthly Salary / 30 (Fixed)
Example: ₹24,000 / 30 = ₹800/day
```

### **New Logic (Actual Month Days):**
```
Per Day Salary = Monthly Salary / Actual Days in Month
Example (January): ₹24,000 / 31 = ₹774.19/day
Example (February): ₹24,000 / 28 = ₹857.14/day
Example (April): ₹24,000 / 30 = ₹800/day
```

---

## 🔢 Calculation Example

### **Scenario:**
- **Employee:** Rohan Jadhav
- **Month:** January 2025
- **Daily Salary Rate:** ₹800/day
- **Company A:** Worked 15 days
- **Company B:** Worked 10 days

### **Calculation:**

```javascript
// Company A
Present Days: 15
Daily Rate: ₹800
Salary from Company A = 15 × 800 = ₹12,000

// Company B
Present Days: 10
Daily Rate: ₹850
Salary from Company B = 10 × 850 = ₹8,500

// Total Salary
Total = ₹12,000 + ₹8,500 = ₹20,500
```

---

## 📊 How Present Days are Counted

### **From Attendance Collection:**
```javascript
// Each attendance record = 1 present day
const attendanceRecords = [
  { date: "2025-01-01", employeeId: "emp123", companyId: "comp001" },
  { date: "2025-01-02", employeeId: "emp123", companyId: "comp001" },
  { date: "2025-01-03", employeeId: "emp123", companyId: "comp002" },
  // ... more records
];

// For January 2025 + Company A (comp001)
const companyAAttendance = attendanceRecords.filter(r => 
  r.companyId === "comp001" && r.date.startsWith("2025-01")
);

const presentDays = companyAAttendance.length;  // 15 days
const salary = presentDays × 800;  // ₹12,000
```

---

## 🔄 Complete Flow

### **1. Add Employee** (AddEmployeeForm.jsx)
```javascript
{
  name: "Rohan Jadhav",
  salary: "800",        // Daily salary rate (per day)
  shift: "8 Hours"      // Work shift
}
```

### **2. Mark Attendance** (Attendance.jsx)
```javascript
// Each day employee is present
{
  employeeId: "emp123",
  date: "2025-01-01",
  companyId: "comp001",
  checkIn: "09:00",
  checkOut: "17:00",
  status: "present"
}
```

### **3. Calculate Salary** (SalaryBilling.jsx)
```javascript
// At month end
const fetchBillingData = async () => {
  // 1. Fetch all attendance for selected month
  const monthAttendance = getAttendanceForMonth("2025-01");
  
  // 2. Group by company
  const companyGroups = {
    "comp001": [15 attendance records],
    "comp002": [10 attendance records]
  };
  
  // 3. Calculate salary per company
  for (const company in companyGroups) {
    const presentDays = companyGroups[company].length;
    const dailyRate = company.dayWiseSalary || 800;
    const companySalary = presentDays × dailyRate;
  }
  
  // 4. Total salary = Sum of all companies
  const totalSalary = ₹12,000 + ₹8,500 = ₹20,500
};
```

### **4. Apply Deductions**
```javascript
// Deductions
const deductions = {
  advance: 2000,
  epfo: 1800,
  esic: 750,
  uniform: 400,
  shoes: 250
};

const totalDeductions = 5200;

// Net Salary
const netSalary = 20500 - 5200 = ₹15,300
```

---

## 💡 Key Benefits

✅ **Simple:** Just count present days - no need to calculate hours  
✅ **Accurate:** Based on actual attendance records  
✅ **Flexible:** Different daily rates for different companies  
✅ **Transparent:** Easy to verify - Present Days × Daily Rate

---

## 📝 Important Notes

1. **One Attendance Record = One Present Day**
   - Employee comes to work = 1 attendance entry = 1 day counted

2. **Multiple Companies Supported**
   - Same employee can work for different companies
   - Each company has own daily rate
   - Total salary = Sum of all companies

3. **Sundays Still Not Counted**
   - Working days exclude Sundays
   - Only actual present days are counted

4. **Daily Rate Fallback**
   - If company daily rate not found: Default = ₹800/day
   - Can be overridden in company settings

---

## 🔧 Modified Files

1. **AddEmployeeForm.jsx**
   - Field label: "Daily Salary Rate"
   - Placeholder: "Enter daily salary rate (per day)"

2. **SalaryBilling.jsx** (Line 783-800)
   - Changed: `companySalary = totalHours × hourlySalary`
   - To: `companySalary = totalPresentDays × dayWiseSalary`

---

## 📊 Example Console Output

```
💰 Fetching billing data for employee: emp123
📅 Filtered attendance for billing: 25 records
🏢 Company A: 15 days × ₹800 = ₹12000
🏢 Company B: 10 days × ₹850 = ₹8500
💰 Total billing salary calculated: 20500
```

---

## ✅ Testing Checklist

- [ ] Add employee with daily salary rate
- [ ] Mark attendance for multiple days
- [ ] Check attendance count matches actual present days
- [ ] Verify salary = Present Days × Daily Rate
- [ ] Test with multiple companies
- [ ] Check deductions working correctly
- [ ] Generate salary slip and verify amounts

---

**Last Updated:** 18 December 2024  
**Feature:** Day-wise Salary Calculation (Present Days × Daily Rate)

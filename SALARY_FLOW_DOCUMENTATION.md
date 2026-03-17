# 📊 Security Guard Software - Salary Calculation Flow

## 🏢 Company Page Flow

### **Company.jsx** - Company Management
```
📍 Location: src/pages/Company.jsx
```

**मुख्य Features:**
1. **Add Company** - नवीन security company add करणे
2. **View Companies** - सर्व companies चा table view
3. **Company Status** - On Duty, Off Duty, Break
4. **Company Stats** - Total companies, on duty count

**Fields:**
- Company ID (Custom ID)
- Company Name
- City & State
- Contact Person
- Phone Number
- Status (on_duty/off_duty/break)

---

## 💰 Salary Calculation Flow

### **Step 1: Employee मध्ये Salary & Shift Add करणे**

**Location:** `src/components/Forms/AddEmployeeForm.jsx`

**नवीन Fields (आता available):**
```javascript
{
  shift: "8 Hours" | "12 Hours",  // Work Shift
  salary: "15000"                  // Monthly Salary
}
```

---

### **Step 2: Attendance Mark करणे**

**Location:** `src/pages/Attendance.jsx` किंवा `src/pages/MarkAttendance.jsx`

**Attendance Fields:**
- Employee ID
- Date
- Check-In Time
- Check-Out Time
- Working Hours (Auto-calculated)
- Company ID (कोणत्या company साठी काम केलं)
- Status (present/absent)

**महत्वाचे:**
- Sunday ला working day नाही
- Working hours = Check-Out - Check-In

---

### **Step 3: Billing Data Calculate होणे**

**Location:** `src/pages/SalaryBilling.jsx` → `fetchBillingData()`

#### **3.1 Attendance Filter (Line 700-708)**
```javascript
// Selected month च्या सर्व attendance fetch करणे
const filtered = allAttendance.filter((a) =>
  a.date && a.date.startsWith(selectedMonth)  // e.g., "2024-01"
);
```

#### **3.2 Company-wise Group करणे (Line 714-721)**
```javascript
// प्रत्येक company साठी वेगळा group
const companyGroups = {};
filtered.forEach((a) => {
  const companyKey = a.companyId || a.companyName;
  companyGroups[companyKey].push(a);
});
```

#### **3.3 Working Hours Calculate करणे (Line 727-744)**
```javascript
const getWorkingHours = (record) => {
  // Option 1: Pre-formatted hours
  if (record.workingHoursFormatted) {
    // Parse "8h 30m" format
    const h = parseInt(match[1]) || 0;
    const m = parseInt(match[2]) || 0;
    return h + m / 60;  // 8.5 hours
  }
  
  // Option 2: Calculate from check-in/out times
  const inTime = "09:00";
  const outTime = "17:30";
  // Difference = 8.5 hours
};
```

#### **3.4 Company Salary Rates Fetch करणे (Line 758-781)**
```javascript
// Company collection मधून rates घेणे
const companyData = {
  hourlySalary: 100,      // Per hour rate (₹100/hr)
  dayWiseSalary: 800      // Per day rate (₹800/day)
};

// Fallback if company not found
hourlySalary = 100;  // Default
dayWiseSalary = 800; // Default
```

#### **3.5 Final Salary Calculation (Line 783-795)**
```javascript
// प्रत्येक company साठी
const companySalary = totalHours × hourlySalary;

// Example:
// Company A: 160 hours × ₹100 = ₹16,000
// Company B: 80 hours × ₹120 = ₹9,600
// ────────────────────────────────────
// Total Billing Salary = ₹25,600
```

---

### **Step 4: Deductions (कपात)**

**Location:** `src/pages/SalaryBilling.jsx` → `fetchPreviousDeductions()`

#### **4.1 Advance Deduction (Line 443-494)**
```javascript
// advance_deduction_history collection मधून
const totalAdvance = 0;
const totalOriginalAdvance = 0;

snapshot.docs.forEach((doc) => {
  const advanceData = doc.data();
  
  // Original amount given
  const originalAmount = parseFloat(advanceData.amount || 0);
  
  // Remaining after previous salary deductions
  const remainingAmount = parseFloat(advanceData.remainingAfterDeduction || 0);
  
  if (remainingAmount > 0 && advanceData.status !== 'fully_deducted') {
    totalAdvance += remainingAmount;
    totalOriginalAdvance += originalAmount;
  }
});
```

**Example:**
```
Original Advance Given:    ₹10,000
Previous Deductions:       - ₹3,000
────────────────────────────────────
Remaining to Deduct:       ₹7,000
Current Month Deduction:   - ₹2,000
────────────────────────────────────
New Remaining:             ₹5,000
```

#### **4.2 Issued Items Deduction (Line 522-612)**
```javascript
// issuedItems collection मधून
const items = [
  {
    item: "Shoes",
    cost: 1500,
    totalDeducted: 500,
    remaining: 1000
  },
  {
    item: "Uniform",
    cost: 2000,
    totalDeducted: 800,
    remaining: 1200
  }
];

// Current month deduction
const shoesDeduction = 250;  // Deduct ₹250 from shoes
const uniformDeduction = 400; // Deduct ₹400 from uniform
```

#### **4.3 Other Deductions**
```javascript
{
  epfo: "1800",        // Employee Provident Fund Organization
  esic: "750",         // Employee State Insurance Corporation
  advanceDeduction: "2000",
  shoes: "250",
  uniform: "400",
  other: "0"
}
```

---

### **Step 5: Net Salary Calculation**

**Location:** `src/pages/SalaryBilling.jsx` → `calculateTotal()` (Line 1132-1151)

```javascript
// EARNINGS
const basicSalary = parseFloat(formData.basicSalary || 0);        // ₹25,600 (from billing)
const bonus = parseFloat(formData.bonus || 0);                    // ₹0
const incentives = parseFloat(formData.incentives || 0);          // ₹0
const totalEarnings = basicSalary + bonus + incentives;           // ₹25,600

// DEDUCTIONS
const advanceDeduction = parseFloat(formData.advanceDeduction || 0);  // ₹2,000
const epfo = parseFloat(formData.epfo || 0);                          // ₹1,800
const esic = parseFloat(formData.esic || 0);                          // ₹750
const uniform = parseFloat(formData.uniform || 0);                    // ₹400
const shoes = parseFloat(formData.shoes || 0);                        // ₹250
const other = parseFloat(formData.other || 0);                        // ₹0
const totalDeductions = advanceDeduction + epfo + esic + uniform + shoes + other;  // ₹5,200

// NET SALARY (Take Home)
const netSalary = totalEarnings - totalDeductions;                    // ₹20,400
```

---

### **Step 6: Salary Report Generation**

**Location:** `src/pages/SalaryBilling.jsx` → `handleSubmit()` (Line 1339-1656)

#### **6.1 Salary Report Data Structure**
```javascript
const salaryReport = {
  // Basic Info
  employeeId: "emp123",
  employeeName: "Rohan Jadhav",
  month: "01",
  year: "2025",
  monthName: "January",
  
  // Salary Details
  basicSalary: 25600,
  bonus: 0,
  incentives: 0,
  allowances: 0,
  
  // Deductions
  advanceDeduction: 2000,
  epfo: 1800,
  esic: 750,
  uniform: 400,
  shoes: 250,
  other: 0,
  
  // Total
  totalAmount: 20400,  // Net Salary
  
  // Status
  status: "generated",  // generated → pending → paid
  generatedDate: "2025-01-18T10:30:00Z",
  
  // Company Info
  companyInfo: {
    fullName: "ABC Security Services",
    address: "Mumbai, Maharashtra",
    phone: "9876543210",
    email: "abc@security.com"
  },
  
  // Billing Breakdown
  billingBreakdown: [
    {
      companyId: "comp001",
      companyName: "Company A",
      totalDays: 20,
      totalHours: "160h 0m",
      hourlySalary: "100.00",
      companySalary: "16000.00"
    },
    {
      companyId: "comp002",
      companyName: "Company B",
      totalDays: 10,
      totalHours: "80h 0m",
      hourlySalary: "120.00",
      companySalary: "9600.00"
    }
  ],
  
  // Employee Bank Details
  employeeBankDetails: {
    bankName: "HDFC Bank",
    bankAccount: "123456789012",
    bankIfsc: "HDFC0001234",
    esiNumber: "ESI123456",
    pfNumber: "PF789012"
  },
  
  // Tracking
  advanceTracking: {
    originalAmount: 10000,
    previousDeductions: 3000,
    currentDeduction: 2000,
    remainingAmount: 5000
  }
};
```

#### **6.2 Save to Firebase**
```javascript
// Collection: salary_reports
await addDoc(collection(db, "salary_reports"), salaryReport);
```

---

### **Step 7: Salary Report View & Status Update**

**Location:** `src/pages/SalaryReports.jsx`

#### **7.1 Status Flow**
```
generated → pending → paid
```

#### **7.2 Status Update Logic (Line 231-346)**
```javascript
const updateSalaryStatus = async (reportId, newStatus) => {
  const updateData = {
    status: newStatus,
    paymentInfo: {
      paymentStatus: newStatus,
      paymentDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  // Update in Firebase
  const reportRef = doc(db, "salary_reports", reportId);
  await updateDoc(reportRef, updateData);
};
```

#### **7.3 Attendance Calculation for Reports (Line 90-146)**
```javascript
const calculateAttendanceForEmployee = async (employeeId, monthName, year) => {
  // Filter attendance for specific month
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);
  
  // Count present days
  let presentDays = 0;
  attendanceSnapshot.forEach((doc) => {
    const attendanceDate = doc.data().date.toDate();
    if (attendanceDate >= startDate && attendanceDate <= endDate) {
      if (doc.data().status === 'present' || doc.data().checkIn) {
        presentDays++;
      }
    }
  });
  
  // Calculate working days (excluding Sundays)
  const totalDays = endDate.getDate();
  let workingDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() !== 0) {  // 0 = Sunday
      workingDays++;
    }
  }
  
  const absentDays = workingDays - presentDays;
  
  return {
    presentDays,     // e.g., 24
    absentDays,      // e.g., 2
    totalWorkingDays // e.g., 26
  };
};
```

---

## 📄 Salary Slip PDF Generation

**Location:** `src/pages/SalaryReports.jsx` → `generatePDF()` (Line 864-1048)

### **PDF Structure:**
```
┌─────────────────────────────────────────────┐
│           ABC Security Services             │
│        Mumbai, Maharashtra                  │
│    Phone: 9876543210 | Email: abc@...      │
├─────────────────────────────────────────────┤
│              SALARY SLIP                    │
│      Generated Date: 18/01/2025             │
├─────────────────────────────────────────────┤
│     EMPLOYEE INFORMATION                    │
│  Employee Name: Rohan Jadhav   ESI: ESI123 │
│  Month: January 2025           PF: PF789   │
│  Payment Date: 20/01/2025                   │
├─────────────────────────────────────────────┤
│  EARNINGS          │  DEDUCTIONS            │
│  Basic: ₹25,600    │  Advance: ₹2,000       │
│  HRA: ₹0           │  EPFO: ₹1,800          │
│  Allowances: ₹0    │  ESIC: ₹750            │
│  Bonus: ₹0         │  Uniform: ₹400         │
│  Incentives: ₹0    │  Shoes: ₹250           │
│                    │  Other: ₹0             │
├────────────────────┼────────────────────────┤
│  Total: ₹25,600    │  Total: ₹5,200         │
└────────────────────┴────────────────────────┘
  
  Net Pay: ₹20,400
  In Words: Twenty Thousand Four Hundred Rupees Only
  
  ┌─────────────────┬─────────────────┐
  │  Prepared By:   │  Received By:   │
  │                 │                 │
  │                 │                 │
  │  Signature      │  Signature      │
  └─────────────────┴─────────────────┘
```

---

## 🔄 Complete Flow Summary

```
1. ADD EMPLOYEE
   ├─ Name, DOB, Aadhar, etc.
   ├─ Salary: ₹15,000
   └─ Shift: 8 Hours / 12 Hours

2. MARK ATTENDANCE
   ├─ Daily Check-In/Out
   ├─ Working Hours Calculated
   └─ Company Assigned

3. BILLING CALCULATION (Auto)
   ├─ Fetch Attendance by Month
   ├─ Group by Company
   ├─ Calculate Working Hours
   ├─ Fetch Company Rates
   └─ Calculate Salary per Company
   
4. DEDUCTIONS
   ├─ Advance: From advance_deduction_history
   ├─ Items: From issuedItems (Shoes, Uniform)
   ├─ EPFO/ESIC: Manual entry
   └─ Total Deductions = Sum of all

5. NET SALARY
   └─ Net = Total Earnings - Total Deductions

6. GENERATE REPORT
   ├─ Save to salary_reports collection
   ├─ Status: generated
   └─ PDF Ready for Download

7. PAYMENT
   ├─ Update Status: generated → paid
   ├─ Record Payment Date
   └─ Update Advance/Items Remaining Balance

8. SALARY SLIP
   └─ Print/Download PDF with all details
```

---

## 💡 Key Points

1. **Salary Basis**: Working hours × Company hourly rate
2. **Multiple Companies**: एकाच महिन्यात multiple companies साठी काम केलं तर सर्व companies चं salary add होते
3. **Deductions**: Advance, Items (Shoes/Uniform), EPFO, ESIC automatically tracked
4. **Status Flow**: generated → pending → paid
5. **Sundays**: Working days मध्ये count नाहीत
6. **Advance Tracking**: Automatic calculation - Original amount - Previous deductions = Current remaining

---

## 📊 Database Collections

```
1. employees
   └─ Basic employee data, salary, shift

2. companies
   └─ Company details, hourly rates, day rates

3. attendance
   └─ Daily attendance with check-in/out times

4. salary_reports
   └─ Generated salary reports with all details

5. advance_deduction_history
   └─ Employee advance tracking

6. issuedItems
   └─ Issued items (Shoes, Uniform) tracking

7. monthly_salary_data
   └─ Auto-saved monthly billing breakdown
```

---

## ✅ Latest Changes (आज केलेले)

**AddEmployeeForm.jsx** मध्ये add केले:

1. ✅ **Salary Field** - Monthly salary input
2. ✅ **Work Shift** - 8 Hours / 12 Hours options
3. ✅ Both fields are **required**
4. ✅ Proper validation and data storage

---

## 📝 Notes

- सर्व amounts ₹ (Rupees) मध्ये आहेत
- Dates ISO format मध्ये stored: "2025-01-18T10:30:00Z"
- Employee names lowercase without spaces for document IDs
- PDF generation uses jsPDF library
- Real-time updates using Firebase Firestore

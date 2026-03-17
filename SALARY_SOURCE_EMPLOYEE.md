# 💰 Salary Source - Employee vs Company

## ❓ Question: Salary कोणत्या ठिकाणून येते?

**Answer:** आता salary **EMPLOYEE** चं form मधून येते! 👤

---

## 🔄 Changes Made

### **Before (पहिले):**
```javascript
// Company च्या dayWiseSalary use होत होती
dayWiseSalary = companyData.dayWiseSalary || 800;
companySalary = totalPresentDays × dayWiseSalary;
```

### **After (आता):**
```javascript
// Employee च्या salary field use होते
const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
const employeeDailySalary = parseFloat(selectedEmployee?.salary || 800);
companySalary = totalPresentDays × employeeDailySalary;
```

---

## 📊 Complete Flow

### **1. Employee Form** (AddEmployeeForm.jsx)
```
Employee Add करताना:
┌────────────────────────────────┐
│ Name: Rohan Jadhav             │
│ Shift: 8 Hours                 │
│ Daily Salary Rate: ₹850        │ ← येथून salary येते
└────────────────────────────────┘
```

### **2. Attendance Mark** (Attendance.jsx)
```
Daily attendance:
┌────────────────────────────────┐
│ Date: 2025-01-01               │
│ Employee: Rohan Jadhav         │
│ Company: ABC Security          │
│ Status: Present                │
└────────────────────────────────┘
```

### **3. Salary Calculation** (SalaryBilling.jsx)
```javascript
// Step 1: Employee ची daily salary fetch करा
const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
const employeeDailySalary = 850;  // Employee form मधून

// Step 2: Present days count करा
const totalPresentDays = 20;  // January मध्ये 20 days present

// Step 3: Salary calculate करा
const companySalary = totalPresentDays × employeeDailySalary;
                    = 20 × 850
                    = ₹17,000
```

---

## 🔍 Key Points

### **✅ Employee च्या salary वापरतो**
- प्रत्येक employee चा वेगवेगळा daily rate असू शकतो
- Employee form मध्ये enter केलेली salary use होते
- सर्व companies साठी सारखी rate

### **❌ Company ची salary वापरत नाही**
- Company collection मधली dayWiseSalary ignore होते
- सर्व calculations employee च्या salary वर base होतात

---

## 💡 Example

### **Employee Details:**
```javascript
{
  id: "emp123",
  name: "Rohan Jadhav",
  salary: "850",  // ₹850 per day (येथून salary येते)
  shift: "8 Hours"
}
```

### **Attendance for January:**
```javascript
Company A: 15 days present
Company B: 10 days present
Total: 25 days present
```

### **Salary Calculation:**
```
Company A:
  15 days × ₹850 = ₹12,750

Company B:
  10 days × ₹850 = ₹8,500

─────────────────────────────────
Total Salary:    ₹21,250

Deductions:      -₹5,000
─────────────────────────────────
NET SALARY:      ₹16,250
```

---

## 📝 Important Notes

1. **Single Rate for All Companies**
   - एकच employee सर्व companies साठी एकाच rate वर काम करतो
   - Company वेगवेगळी असली तरी rate employee चा वापरतो

2. **Manual Entry Required**
   - प्रत्येक employee add करताना salary manually enter करावी लागेल
   - Default fallback: ₹800/day (if no salary entered)

3. **Easy to Update**
   - Employee चा rate बदलायचा असला तर फक्त employee edit करा
   - सगळी calculations automatically update होतील

---

## 🔧 Modified Files

### **1. AddEmployeeForm.jsx** (Lines 285-294)
```javascript
<Input
  label="Daily Salary Rate"          // Updated label
  id="salary"
  type="number"
  value={formData.salary}
  onChange={handleChange}
  placeholder="Enter daily salary rate (per day)"  // Updated placeholder
  required
  icon={BanknotesIcon}
/>
```

### **2. SalaryBilling.jsx** (Lines 712-718)
```javascript
// Fetch employee's daily salary rate
const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
const employeeDailySalary = parseFloat(selectedEmployee?.salary || 800);

console.log(`👤 Using Employee Daily Salary Rate: ₹${employeeDailySalary}/day`);
```

### **3. SalaryBilling.jsx** (Lines 792, 795, 804)
```javascript
// Use employee's rate for calculation
const companySalary = totalPresentDays * employeeDailySalary;
console.log(`🏢 ${companyName}: ${totalPresentDays} days × ₹${employeeDailySalary} = ₹${companySalary}`);

companyBreakdown.push({
  dayWiseSalary: employeeDailySalary,  // Employee's rate
  companySalary: companySalary.toFixed(2)
});
```

---

## ✅ Testing Steps

1. **Add Employee**
   - Name: Test Employee
   - Daily Salary Rate: ₹900
   - Shift: 8 Hours

2. **Mark Attendance**
   - Mark present for 5 days
   - Different companies (if needed)

3. **Generate Salary**
   - Go to Salary Billing
   - Select employee & month
   - Check calculation: 5 days × ₹900 = ₹4,500 ✓

4. **Verify Console**
   ```
   👤 Using Employee Daily Salary Rate: ₹900/day
   🏢 Company A: 5 days × ₹900 = ₹4500
   ```

---

## 📌 Summary

| Item | Source |
|------|--------|
| **Daily Salary Rate** | Employee Form (salary field) |
| **Present Days** | Attendance Records (count) |
| **Calculation** | Present Days × Employee Salary |
| **Fallback Rate** | ₹800/day (if no salary set) |

---

**Last Updated:** 18 December 2024  
**Feature:** Employee-Based Day-Wise Salary Calculation

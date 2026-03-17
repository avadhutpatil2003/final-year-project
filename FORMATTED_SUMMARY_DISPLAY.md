# 📊 Formatted Summary Button Output

## ✅ Updated Summary Display

### **Structure:**
```
Company Name  ||  Shift  ||  Days  ||  Salary
```

---

## 📋 Example Output

### **When Summary Button Clicked:**

```
📊 SALARY BREAKDOWN
════════════════════════════════════════════════════════════

Company Name              || Shift      || Days   || Salary
────────────────────────────────────────────────────────────
ABC Security              || 8 Hours    || 15     || ₹12000.00
XYZ Company               || 12 Hours   || 10     || ₹8000.00
PQR Services              || 8 Hours    || 6      || ₹4800.00
────────────────────────────────────────────────────────────
TOTAL                                             ₹24800.00
════════════════════════════════════════════════════════════
```

---

## 🔍 Data Elements

### **1. Company Name**
- Fetched from: `billingBreakdown[].companyName`
- Max length: 23 characters (truncated if longer)
- Padded to: 25 characters

### **2. Shift Time**
- Fetched from: Company collection
- Fields checked: `shiftHours`, `shift`
- Default: "8 Hours"
- Examples: "8 Hours", "12 Hours"

### **3. Working Days**
- Fetched from: `billingBreakdown[].totalDays`
- Count of attendance records
- Example: 15, 10, 6

### **4. Salary**
- Fetched from: `billingBreakdown[].companySalary`
- Format: ₹12000.00
- Per company calculated amount

---

## 💻 Code Logic

### **Step 1: Fetch Company Shifts**
```javascript
const companiesRef = collection(db, "companies");
const companyShifts = {};

for (const comp of formData.billingBreakdown) {
  const q = query(companiesRef, where("companyId", "==", comp.companyId));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const companyData = snapshot.docs[0].data();
    companyShifts[comp.companyId] = companyData.shiftHours || "8 Hours";
  }
}
```

### **Step 2: Build Formatted Table**
```javascript
let summary = "📊 SALARY BREAKDOWN\n";
summary += "═".repeat(60) + "\n\n";

// Header
summary += "Company Name".padEnd(25) + " || ";
summary += "Shift".padEnd(10) + " || ";
summary += "Days".padEnd(6) + " || ";
summary += "Salary\n";
summary += "─".repeat(60) + "\n";

// Rows
formData.billingBreakdown.forEach(comp => {
  const shiftTime = companyShifts[comp.companyId] || "8 Hours";
  const compName = comp.companyName.substring(0, 23).padEnd(25);
  const shift = shiftTime.toString().padEnd(10);
  const days = comp.totalDays.toString().padEnd(6);
  const salary = `₹${comp.companySalary}`;
  
  summary += `${compName} || ${shift} || ${days} || ${salary}\n`;
  grandTotal += parseFloat(comp.companySalary || 0);
});

// Footer
summary += "─".repeat(60) + "\n";
summary += "TOTAL".padEnd(45) + `₹${grandTotal.toFixed(2)}\n`;
summary += "═".repeat(60);
```

---

## 🎯 Complete Examples

### **Example 1: Single Company**
```
📊 SALARY BREAKDOWN
════════════════════════════════════════════════════════════

Company Name              || Shift      || Days   || Salary
────────────────────────────────────────────────────────────
ABC Security Services     || 8 Hours    || 25     || ₹20000.00
────────────────────────────────────────────────────────────
TOTAL                                             ₹20000.00
════════════════════════════════════════════════════════════
```

### **Example 2: Multiple Companies**
```
📊 SALARY BREAKDOWN
════════════════════════════════════════════════════════════

Company Name              || Shift      || Days   || Salary
────────────────────────────────────────────────────────────
ABC Security              || 8 Hours    || 15     || ₹12000.00
XYZ Guard Services        || 12 Hours   || 10     || ₹12000.00
PQR Protection Agency     || 8 Hours    || 5      || ₹4000.00
────────────────────────────────────────────────────────────
TOTAL                                             ₹28000.00
════════════════════════════════════════════════════════════
```

### **Example 3: Mixed Shifts**
```
📊 SALARY BREAKDOWN
════════════════════════════════════════════════════════════

Company Name              || Shift      || Days   || Salary
────────────────────────────────────────────────────────────
Day Shift Company         || 8 Hours    || 20     || ₹16000.00
Night Shift Company       || 12 Hours   || 15     || ₹18000.00
────────────────────────────────────────────────────────────
TOTAL                                             ₹34000.00
════════════════════════════════════════════════════════════
```

---

## 📊 Column Widths

| Column | Width | Padding | Example |
|--------|-------|---------|---------|
| Company Name | 25 chars | Right padded | "ABC Security        " |
| Shift | 10 chars | Right padded | "8 Hours  " |
| Days | 6 chars | Right padded | "15    " |
| Salary | Variable | None | "₹12000.00" |

---

## ⚠️ Edge Cases

### **Case 1: No Billing Data**
```
⚠️ No billing breakdown available.

Please select employee and month first.
```

### **Case 2: Company Shift Not Found**
```
Company Name              || Shift      || Days   || Salary
────────────────────────────────────────────────────────────
Unknown Company           || 8 Hours    || 10     || ₹8000.00
                              ^^^^^^^^
                           (Default fallback)
```

### **Case 3: Long Company Name**
```
Very Long Company Name That Exceeds Limit
                     ↓ (Truncated to 23 chars)
Very Long Company Nam || 8 Hours    || 15     || ₹12000.00
```

---

## 🔄 Data Flow

```
1. User clicks "Summary" button
   ↓
2. Check if billingBreakdown exists
   ↓
3. For each company in breakdown:
   - Fetch company data from Firestore
   - Get shiftHours or shift field
   - Use fallback "8 Hours" if not found
   ↓
4. Build formatted string:
   - Header with column titles
   - Separator line (dashes)
   - Each company row
   - Separator line
   - Total row
   ↓
5. Show alert with formatted table
```

---

## ✅ Features

1. ✅ **Structured Format** - Clear table layout
2. ✅ **Company Shift** - Fetched from company data
3. ✅ **Working Days** - Total days per company
4. ✅ **Salary Breakdown** - Per company amount
5. ✅ **Grand Total** - Sum of all companies
6. ✅ **Separators** - Visual clarity with lines
7. ✅ **Async Fetch** - Gets company data dynamically

---

## 🎨 Visual Elements

```
═ (Double line) - Top/Bottom borders
─ (Single line) - Row separators
|| (Double pipe) - Column separators
📊 (Chart emoji) - Title icon
⚠️ (Warning emoji) - Error messages
₹ (Rupee symbol) - Currency
```

---

**Last Updated:** 18 December 2024  
**Feature:** Formatted Summary with Company Shift Hours

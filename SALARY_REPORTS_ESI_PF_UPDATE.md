# 📋 Salary Reports - ESI & PF Number Display

## Changes Needed in src/pages/SalaryReports.jsx

### There are 2 PDF generation functions that need updates:

---

## 1. First Function (View All Reports PDF) - Around Line 658

### Find this code:
```javascript
// Payment Date with underline
doc.text(`Payment Date :`, 20, yPos + 24);
const paymentDate = report.status === 'paid' && report.paymentInfo?.paymentDate ? new Date(report.paymentInfo.paymentDate).toLocaleDateString() : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet');
doc.text(paymentDate, 70, yPos + 24);
doc.line(70, yPos + 25, 190, yPos + 25);

// Manual Table Creation (Earnings and Deductions)
yPos += 48;
```

### Replace with:
```javascript
// Payment Date with underline
doc.text(`Payment Date :`, 20, yPos + 24);
const paymentDate = report.status === 'paid' && report.paymentInfo?.paymentDate ? new Date(report.paymentInfo.paymentDate).toLocaleDateString() : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet');
doc.text(paymentDate, 70, yPos + 24);
doc.line(70, yPos + 25, 190, yPos + 25);

// ESI Number with underline
doc.text(`ESI No :`, 20, yPos + 32);
doc.text(report.employeeBankDetails?.esiNumber || report.employeeBankDetails?.esiNo || 'N/A', 70, yPos + 32);
doc.line(70, yPos + 33, 190, yPos + 33);

// PF Number with underline
doc.text(`PF Number :`, 20, yPos + 40);
doc.text(report.employeeBankDetails?.pfNumber || report.employeeBankDetails?.pfNo || 'N/A', 70, yPos + 40);
doc.line(70, yPos + 41, 190, yPos + 41);

// Manual Table Creation (Earnings and Deductions)
yPos += 64; // Increased for ESI and PF lines
```

### Also find (around line 630):
```javascript
// Draw box around employee information section (increased height to fit payment date)
doc.rect(15, yPos, 180, 50);
```

### Replace with:
```javascript
// Draw box around employee information section (increased height to fit payment date, ESI, PF)
doc.rect(15, yPos, 180, 66);
```

---

## 2. Second Function (Single Report PDF) - Around Line 880

### Find this code:
```javascript
// Payment Date with underline
doc.text(`Payment Date :`, 20, yPos + 24);
const paymentDate = report.status === 'paid' && report.paymentInfo?.paymentDate ? new Date(report.paymentInfo.paymentDate).toLocaleDateString() : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet');
doc.text(paymentDate, 70, yPos + 24);
doc.line(70, yPos + 25, 190, yPos + 25);

// Manual Table Creation (Earnings and Deductions)
yPos += 48;
```

### Replace with:
```javascript
// Payment Date with underline
doc.text(`Payment Date :`, 20, yPos + 24);
const paymentDate = report.status === 'paid' && report.paymentInfo?.paymentDate ? new Date(report.paymentInfo.paymentDate).toLocaleDateString() : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet');
doc.text(paymentDate, 70, yPos + 24);
doc.line(70, yPos + 25, 190, yPos + 25);

// ESI Number with underline
doc.text(`ESI No :`, 20, yPos + 32);
doc.text(report.employeeBankDetails?.esiNumber || report.employeeBankDetails?.esiNo || 'N/A', 70, yPos + 32);
doc.line(70, yPos + 33, 190, yPos + 33);

// PF Number with underline
doc.text(`PF Number :`, 20, yPos + 40);
doc.text(report.employeeBankDetails?.pfNumber || report.employeeBankDetails?.pfNo || 'N/A', 70, yPos + 40);
doc.line(70, yPos + 41, 190, yPos + 41);

// Manual Table Creation (Earnings and Deductions)
yPos += 64; // Increased for ESI and PF lines
```

### Also find (around line 852):
```javascript
// Draw box around employee information section (increased height to fit payment date)
doc.rect(15, yPos, 180, 50);
```

### Replace with:
```javascript
// Draw box around employee information section (increased height to fit payment date, ESI, PF)
doc.rect(15, yPos, 180, 66);
```

---

## Summary of Changes:

1. ✅ Added ESI Number field after Payment Date
2. ✅ Added PF Number field after ESI Number
3. ✅ Increased box height from 50 to 66 to accommodate new fields
4. ✅ Increased yPos increment from 48 to 64 before table
5. ✅ Both PDF generation functions updated

## Result:

Employee Information section will now show:
- Employee Name
- Period
- Payment Status
- Payment Date
- **ESI No** ← NEW
- **PF Number** ← NEW

This will appear in both:
- View All Reports PDF
- Single Report PDF
- Print view (automatically included)

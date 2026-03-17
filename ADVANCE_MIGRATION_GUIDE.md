# Advance Migration Guide

## Problem
Employee records मध्ये जुना advance amount manually entered आहे, पण advances collection मध्ये त्याची entry नाही.

## Solution
जुन्या advance amounts साठी advances collection मध्ये entries create करा.

## Steps

### Option 1: Manual Entry (Recommended)
प्रत्येक employee साठी ज्याच्याकडे existing advance आहे:

1. Salary Advance page वर जा
2. "Give Advance to Employee" form मध्ये:
   - Employee select करा
   - Amount = त्याचा existing advance amount
   - Date = आजची date किंवा approximate date
   - Given By = कोणी दिला ते select करा
3. Submit करा

हे केल्यावर:
- Advances collection मध्ये proper entry होईल
- Employee record मध्ये amount update होईल
- History properly track होईल

### Option 2: Firebase Console (Quick Fix)
1. Firebase Console मध्ये जा
2. Firestore Database > employees collection
3. प्रत्येक employee document मध्ये:
   - `advance` field = "0"
   - `advanceRemaining` field = "0"
   - Save करा

4. नंतर Salary Advance page वरून नवीन advances द्या

### Option 3: Bulk Migration Script
जर खूप employees आहेत तर, एक migration script run करा:

```javascript
// Firebase Console > Firestore > Run in browser console
const migrateAdvances = async () => {
  const employeesRef = firebase.firestore().collection('employees');
  const snapshot = await employeesRef.get();
  
  snapshot.forEach(async (doc) => {
    const employee = doc.data();
    const existingAdvance = parseFloat(employee.advance || 0);
    
    if (existingAdvance > 0) {
      // Create advance entry
      await firebase.firestore().collection('advances').add({
        employeeId: doc.id,
        employeeName: employee.name,
        amount: existingAdvance,
        date: firebase.firestore.Timestamp.now(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        givenBy: 'System Migration',
        reason: 'Migrated from old system',
        notes: 'Auto-migrated existing advance',
        createdAt: firebase.firestore.Timestamp.now(),
        status: 'active',
        remainingAmount: existingAdvance
      });
      
      console.log(`✅ Migrated ${employee.name}: ₹${existingAdvance}`);
    }
  });
  
  console.log('Migration completed!');
};

// Run migration
migrateAdvances();
```

## Recommendation
**Option 1 (Manual Entry)** वापरा कारण:
- Proper supervisor tracking होईल
- Accurate dates मिळतील
- History clean राहील
- कोणी advance दिला ते record होईल

## After Migration
Migration नंतर सर्व employees साठी:
- Total Amount = Advances collection मधून
- Current Advance = Advances collection मधून
- Employee record मधला advance amount ignore होईल

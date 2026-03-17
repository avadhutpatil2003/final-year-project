# Firebase Collections Creator Guide

## 🎯 Overview
आपके Security Guard Software में Firebase collections create करने की functionality add हो गई है।

## 📁 Created Files
1. **`src/firebaseOperations.js`** - Simple Firebase utility functions
2. **Updated `src/pages/SalaryBilling.jsx`** - Collection creator buttons added

## 🚀 How to Use

### Step 1: Start Your App
```bash
npm start
```

### Step 2: Navigate to Salary Billing
- Login to your app
- Go to Salary Billing page: `http://localhost:3000/salary-billing`

### Step 3: Create Collections
आपको page के top पर "Firebase Collection Creator" section दिखेगा। यहाँ 6 buttons हैं:

1. **Create Guards Collection** - Security guards की information
2. **Create Attendance Collection** - Attendance records
3. **Create Incidents Collection** - Security incidents
4. **Create Shifts Collection** - Shift schedules
5. **Create Payroll Collection** - Salary records
6. **Create Custom Collection** - Any custom data

### Step 4: Check Firebase Console
- Visit: https://console.firebase.google.com/
- Select your project: `security-app-b2e30`
- Go to Firestore Database
- आपको नए collections दिखेंगे

## 📋 Available Functions

### In `firebaseOperations.js`:
```javascript
// Create new collection
createNewCollection(collectionName, data)

// Get all documents
getCollectionData(collectionName)

// Update document
updateCollectionData(collectionName, docId, data)

// Delete document
deleteCollectionData(collectionName, docId)
```

## 💡 Example Usage in Other Components

```javascript
import { createNewCollection, getCollectionData } from '../firebaseOperations';

// Create new guard
const guardData = {
  name: 'John Doe',
  employeeId: 'GRD002',
  phone: '+91 9876543210',
  shift: 'night',
  location: 'Back Gate',
  salary: 28000,
  status: 'active'
};

const result = await createNewCollection('guards', guardData);
if (result.success) {
  console.log('Guard created with ID:', result.id);
}

// Get all guards
const guards = await getCollectionData('guards');
if (guards.success) {
  console.log('All guards:', guards.data);
}
```

## 🔧 Collections Structure

### Guards Collection
```javascript
{
  name: 'राहुल शर्मा',
  employeeId: 'GRD001',
  phone: '+91 9876543210',
  shift: 'morning',
  location: 'Main Gate',
  salary: 25000,
  status: 'active',
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Collection
```javascript
{
  guardId: 'GRD001',
  guardName: 'राहुल शर्मा',
  date: 'Mon Nov 04 2024',
  checkIn: '09:00 AM',
  checkOut: '06:00 PM',
  status: 'present',
  location: 'Main Gate',
  createdAt: Date,
  updatedAt: Date
}
```

### Incidents Collection
```javascript
{
  reportedBy: 'राहुल शर्मा',
  incidentType: 'Security Check',
  description: 'Routine security patrol completed',
  location: 'Main Gate',
  severity: 'low',
  status: 'resolved',
  createdAt: Date,
  updatedAt: Date
}
```

## ✅ Next Steps
1. Click buttons to create sample collections
2. Check Firebase Console to verify
3. Use these functions in your other components
4. Modify the sample data as per your needs

## 🆘 Support
यदि कोई problem आए तो बताएं। सभी functions ready हैं और आप easily नए collections create कर सकते हैं!

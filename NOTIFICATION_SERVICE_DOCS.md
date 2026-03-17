# Notification Service Documentation

## 📁 File Structure

```
src/
├── utils/
│   └── notificationService.js  ← Notification service (NEW)
├── contexts/
│   └── NotificationContext.jsx ← Notification state management
├── components/
│   └── Navbar/
│       └── NotificationDropdown.jsx ← Bell icon UI
└── pages/
    └── SalaryBilling.jsx ← Uses notification service
```

## 🎯 Purpose

**Separate notification logic** from business logic. SalaryBilling.jsx फक्त call करते, actual notification creation logic service मध्ये आहे.

## 🔧 Notification Service Functions

### 1. `createAdvanceClearedNotification(employeeId, employeeName)`
Creates notification when advance is fully paid.

```javascript
await createAdvanceClearedNotification('emp123', 'Rohan Sharma');
```

### 2. `createUniformClearedNotification(employeeId, employeeName)`
Creates notification when uniform is fully paid.

```javascript
await createUniformClearedNotification('emp123', 'Rohan Sharma');
```

### 3. `createShoesClearedNotification(employeeId, employeeName)`
Creates notification when shoes are fully paid.

```javascript
await createShoesClearedNotification('emp123', 'Rohan Sharma');
```

### 4. `createDeductionNotifications(deductionStatus, employeeId, employeeName)` ⭐
**Main function** - Creates multiple notifications at once.

```javascript
await createDeductionNotifications(
  {
    advanceCleared: true,
    uniformCleared: false,
    shoesCleared: true
  },
  'emp123',
  'Rohan Sharma'
);
// Creates 2 notifications: advance + shoes
```

### 5. `createCustomNotification(notificationData)`
Creates any custom notification.

```javascript
await createCustomNotification({
  title: 'Payment Due',
  message: 'Salary payment pending for 5 days',
  type: 'warning',
  employeeId: 'emp123'
});
```

## 📊 Usage in SalaryBilling.jsx

```javascript
// Import
import { createDeductionNotifications } from "../utils/notificationService";

// Use (line 1441)
await createDeductionNotifications(
  {
    advanceCleared: currentAdvanceRemaining > 0 && newAdvanceRemaining === 0,
    uniformCleared: currentUniformRemaining > 0 && newUniformRemaining === 0,
    shoesCleared: currentShoesRemaining > 0 && newShoesRemaining === 0
  },
  employeeId,
  employeeForUpdate.name || formData.employeeName
);
```

## ✅ Benefits

| Before | After |
|--------|-------|
| ❌ 50+ lines in SalaryBilling.jsx | ✅ 7 lines - just a function call |
| ❌ Hard to maintain | ✅ Centralized service |
| ❌ Can't reuse | ✅ Reusable anywhere |
| ❌ Mixed concerns | ✅ Separation of concerns |

## 🎯 How It Works

```
1. Bill Generated in SalaryBilling.jsx
   ↓
2. Deductions calculated
   ↓
3. Check: remaining === 0?
   ↓
4. Call: createDeductionNotifications()
   ↓
5. Service creates Firebase notification
   ↓
6. NotificationContext auto-fetches (60s interval)
   ↓
7. Bell icon shows notification 🔔
```

## 🔥 Example Output

```javascript
// Console logs:
🔔 Advance notification created for Rohan Sharma
🔔 Uniform notification created for Rohan Sharma
✅ Created 2 notification(s) for Rohan Sharma
```

## 🚀 Future Extensions

You can easily add more notification types:

```javascript
export const createSalaryPendingNotification = async (employeeId, employeeName, days) => {
  await addDoc(collection(db, 'notifications'), {
    title: 'Salary Pending',
    message: `${employeeName}'s salary pending for ${days} days`,
    type: 'warning',
    // ...
  });
};
```

## ✅ Complete!

Notification system आता **properly organized** आहे:
- ✅ Separate service file
- ✅ Clean code
- ✅ Reusable functions
- ✅ Easy to maintain

🎉 Ready to use!

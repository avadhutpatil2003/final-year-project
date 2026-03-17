// Test Notification Creation Script
// Run this in browser console to test Firebase notifications

import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

async function testNotification() {
    try {
        console.log('🧪 Testing notification creation...');

        const notif = await addDoc(collection(db, 'notifications'), {
            title: 'Test Notification',
            message: 'This is a test notification',
            type: 'info',
            read: false,
            timestamp: new Date(),
            employeeId: 'test123',
            employeeName: 'Test Employee',
            deductionType: 'test'
        });

        console.log('✅ Test notification created:', notif.id);
        console.log('Check your notification bell icon!');
    } catch (error) {
        console.error('❌ Error creating notification:', error);
    }
}

testNotification();

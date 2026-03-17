// Notification Service
// Handles all notification creation for deductions cleared


import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create notification when advance is fully paid
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee Name
 */
export const createAdvanceClearedNotification = async (employeeId, employeeName, advanceAmount = 0, clearedDate = null) => {
    try {
        console.log('🔄 ATTEMPTING to create Advance notification:', { employeeId, employeeName, advanceAmount, clearedDate });

        // Validate employee name
        if (!employeeName || employeeName === 'Employee') {
            console.error('❌ Invalid employee name:', employeeName);
            // Don't create notification with invalid name
            return false;
        }

        // Check if notification already exists for this employee with same amount
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('employeeId', '==', employeeId),
            where('deductionType', '==', 'advance'),
            where('advanceAmount', '==', advanceAmount)
        );
        const existingNotifications = await getDocs(q);

        if (!existingNotifications.empty) {
            console.log('⚠️ Duplicate notification prevented - notification already exists for', employeeName);
            return false;
        }

        // Use actual cleared date if provided, otherwise current date
        const notificationTimestamp = clearedDate ? new Date(clearedDate) : new Date();

        const notificationData = {
            title: 'Advance Clear',
            message: `${employeeName} - ₹${advanceAmount} advance cleared`,
            type: 'success',
            read: false,
            timestamp: notificationTimestamp,
            employeeId: employeeId,
            employeeName: employeeName,
            advanceAmount: advanceAmount,
            deductionType: 'advance'
        };

        console.log('📝 Notification data:', notificationData);

        const docRef = await addDoc(collection(db, 'notifications'), notificationData);

        console.log(`✅ Advance notification SUCCESSFULLY created with ID: ${docRef.id}`);
        console.log(`🔔 Employee: ${employeeName}, Amount: ₹${advanceAmount}, Time: ${notificationTimestamp}`);
        return true;
    } catch (error) {
        console.error('Error creating advance notification:', error);
        return false;
    }
};

/**
 * Create notification when uniform is fully paid
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee Name
 * @param {number} uniformAmount - Original uniform amount (optional)
 * @param {Date} clearedDate - Actual date when uniform was cleared (optional)
 */
export const createUniformClearedNotification = async (employeeId, employeeName, uniformAmount = 0, clearedDate = null) => {
    try {
        console.log('🔄 ATTEMPTING to create Uniform notification:', { employeeId, employeeName, uniformAmount, clearedDate });

        // Validate employee name
        if (!employeeName || employeeName === 'Employee') {
            console.error('❌ Invalid employee name:', employeeName);
            return false;
        }

        // Check if notification already exists
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('employeeId', '==', employeeId),
            where('deductionType', '==', 'uniform'),
            where('uniformAmount', '==', uniformAmount)
        );
        const existingNotifications = await getDocs(q);

        if (!existingNotifications.empty) {
            console.log('⚠️ Duplicate notification prevented - notification already exists for', employeeName);
            return false;
        }

        // Use actual cleared date if provided
        const notificationTimestamp = clearedDate ? new Date(clearedDate) : new Date();

        const notificationData = {
            title: 'Uniform Clear',
            message: `${employeeName} - ₹${uniformAmount} uniform cleared`,
            type: 'success',
            read: false,
            timestamp: notificationTimestamp,
            employeeId: employeeId,
            employeeName: employeeName,
            uniformAmount: uniformAmount,
            deductionType: 'uniform'
        };

        await addDoc(collection(db, 'notifications'), notificationData);
        console.log(`✅ Uniform notification created for ${employeeName}, Amount: ₹${uniformAmount}, Time: ${notificationTimestamp}`);
        return true;
    } catch (error) {
        console.error('Error creating uniform notification:', error);
        return false;
    }
};

/**
 * Create notification when shoes are fully paid
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee Name
 * @param {number} shoesAmount - Original shoes amount (optional)
 * @param {Date} clearedDate - Actual date when shoes were cleared (optional)
 */
export const createShoesClearedNotification = async (employeeId, employeeName, shoesAmount = 0, clearedDate = null) => {
    try {
        console.log('🔄 ATTEMPTING to create Shoes notification:', { employeeId, employeeName, shoesAmount, clearedDate });

        // Validate employee name
        if (!employeeName || employeeName === 'Employee') {
            console.error('❌ Invalid employee name:', employeeName);
            return false;
        }

        // Check if notification already exists
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('employeeId', '==', employeeId),
            where('deductionType', '==', 'shoes'),
            where('shoesAmount', '==', shoesAmount)
        );
        const existingNotifications = await getDocs(q);

        if (!existingNotifications.empty) {
            console.log('⚠️ Duplicate notification prevented - notification already exists for', employeeName);
            return false;
        }

        // Use actual cleared date if provided
        const notificationTimestamp = clearedDate ? new Date(clearedDate) : new Date();

        const notificationData = {
            title: 'Shoes Clear',
            message: `${employeeName} - ₹${shoesAmount} shoes cleared`,
            type: 'success',
            read: false,
            timestamp: notificationTimestamp,
            employeeId: employeeId,
            employeeName: employeeName,
            shoesAmount: shoesAmount,
            deductionType: 'shoes'
        };

        await addDoc(collection(db, 'notifications'), notificationData);
        console.log(`✅ Shoes notification created for ${employeeName}, Amount: ₹${shoesAmount}, Time: ${notificationTimestamp}`);
        return true;
    } catch (error) {
        console.error('Error creating shoes notification:', error);
        return false;
    }
};

/**
 * Create notifications for all cleared deductions
 * @param {Object} deductionStatus - Status of all deductions
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee Name
 * @param {number} advanceAmount - Original advance amount (optional)
 * @param {Date} clearedDate - Actual date when cleared (optional)
 * @param {number} uniformAmount - Original uniform amount (optional)
 * @param {number} shoesAmount - Original shoes amount (optional)
 */
export const createDeductionNotifications = async (
    deductionStatus,
    employeeId,
    employeeName,
    advanceAmount = 0,
    clearedDate = null,
    uniformAmount = 0,
    shoesAmount = 0
) => {
    const promises = [];

    // Check advance
    if (deductionStatus.advanceCleared) {
        promises.push(createAdvanceClearedNotification(employeeId, employeeName, advanceAmount, clearedDate));
    }

    // Check uniform
    if (deductionStatus.uniformCleared) {
        promises.push(createUniformClearedNotification(employeeId, employeeName, uniformAmount, clearedDate));
    }

    // Check shoes
    if (deductionStatus.shoesCleared) {
        promises.push(createShoesClearedNotification(employeeId, employeeName, shoesAmount, clearedDate));
    }

    // Execute all notifications
    if (promises.length > 0) {
        await Promise.all(promises);
        console.log(`✅ Created ${promises.length} notification(s) for ${employeeName}`);
    }

    return promises.length;
};

/**
 * Create a custom notification
 * @param {Object} notificationData - Notification data
 */
export const createCustomNotification = async (notificationData) => {
    try {
        const notification = {
            title: notificationData.title || 'Notification',
            message: notificationData.message || '',
            type: notificationData.type || 'info', // success, warning, error, info
            read: false,
            timestamp: new Date(),
            ...notificationData
        };

        await addDoc(collection(db, 'notifications'), notification);
        console.log('🔔 Custom notification created:', notification.title);
        return true;
    } catch (error) {
        console.error('Error creating custom notification:', error);
        return false;
    }
};

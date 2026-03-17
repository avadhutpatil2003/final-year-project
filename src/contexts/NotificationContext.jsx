import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications from Firebase
    const fetchNotifications = async () => {
        try {
            const notificationsRef = collection(db, 'notifications');
            const q = query(notificationsRef);
            const snapshot = await getDocs(q);

            const notificationsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by timestamp (newest first)
            notificationsList.sort((a, b) => {
                const timeA = a.timestamp?.toDate?.() || new Date(0);
                const timeB = b.timestamp?.toDate?.() || new Date(0);
                return timeB - timeA;
            });

            setNotifications(notificationsList);

            // Count unread notifications
            const unread = notificationsList.filter(n => !n.read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Mark single notification as read
    const markAsRead = async (notificationId) => {
        try {
            const notificationRef = doc(db, 'notifications', notificationId);
            await updateDoc(notificationRef, { read: true });

            // Update local state
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter(n => !n.read);

            const updatePromises = unreadNotifications.map(notification => {
                const notificationRef = doc(db, 'notifications', notification.id);
                return updateDoc(notificationRef, { read: true });
            });

            await Promise.all(updatePromises);

            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Clear all notifications
    const clearAll = async () => {
        try {
            const deletePromises = notifications.map(notification => {
                const notificationRef = doc(db, 'notifications', notification.id);
                return deleteDoc(notificationRef);
            });

            await Promise.all(deletePromises);

            // Update local state
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing all notifications:', error);
        }
    };

    // Add a new notification
    const addNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.read) {
            setUnreadCount(prev => prev + 1);
        }
    };

    // Set up real-time listener for notifications
    useEffect(() => {
        console.log('🔔 Setting up real-time notification listener...');

        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef);

        // Track previous count to detect new notifications
        let previousCount = 0;

        // Create notification sound function
        const playNotificationSound = () => {
            try {
                // Using Web Audio API for notification sound
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Create a pleasant notification sound (two tones)
                oscillator.frequency.value = 800; // Hz
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);

                // Second tone
                setTimeout(() => {
                    const oscillator2 = audioContext.createOscillator();
                    const gainNode2 = audioContext.createGain();

                    oscillator2.connect(gainNode2);
                    gainNode2.connect(audioContext.destination);

                    oscillator2.frequency.value = 1000; // Hz
                    oscillator2.type = 'sine';

                    gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

                    oscillator2.start(audioContext.currentTime);
                    oscillator2.stop(audioContext.currentTime + 0.1);
                }, 100);

                console.log('🔊 Notification sound played');
            } catch (error) {
                console.error('Error playing notification sound:', error);
            }
        };

        // Real-time listener - automatically updates when new notifications are added
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('📬 Notification update received:', snapshot.size, 'notifications');

            const notificationsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by timestamp (newest first)
            notificationsList.sort((a, b) => {
                const timeA = a.timestamp?.toDate?.() || new Date(0);
                const timeB = b.timestamp?.toDate?.() || new Date(0);
                return timeB - timeA;
            });

            setNotifications(notificationsList);

            // Count unread notifications
            const unread = notificationsList.filter(n => !n.read).length;
            setUnreadCount(unread);

            // Play sound if new notification arrived (count increased)
            if (previousCount > 0 && snapshot.size > previousCount) {
                console.log('🆕 New notification detected! Playing sound...');
                playNotificationSound();
            }

            // Update previous count
            previousCount = snapshot.size;

            console.log('✅ Notifications updated:', notificationsList.length, 'total,', unread, 'unread');
        }, (error) => {
            console.error('❌ Error in notification listener:', error);
        });

        // Cleanup function - unsubscribe when component unmounts
        return () => {
            console.log('🔕 Cleaning up notification listener');
            unsubscribe();
        };
    }, []);

    const value = {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        addNotification,
        refreshNotifications: fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

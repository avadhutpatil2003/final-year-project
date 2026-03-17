import React, { useState, useRef, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    // Convert to title case (proper capitalization)
    const toTitleCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'warning':
                return '⚠️';
            case 'success':
                return '✅';
            case 'info':
                return 'ℹ️';
            case 'error':
                return '❌';
            default:
                return '🔔';
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon with Badge */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <BellIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center font-semibold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-t-lg">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            Notifications {unreadCount > 0 && <span className="text-blue-600 dark:text-blue-400">({unreadCount})</span>}
                        </h3>
                        {notifications.length > 0 && (
                            <div className="flex items-center space-x-3">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={clearAll}
                                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                <BellIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-200 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <span className="text-2xl flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notification.read ? 'font-bold' : 'font-semibold'} text-gray-900 dark:text-white mb-1`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {toTitleCase(notification.message)}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatTimestamp(notification.timestamp)}
                                                </p>
                                                {(notification.advanceAmount || notification.uniformAmount || notification.shoesAmount) && (
                                                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                                        ₹{notification.advanceAmount || notification.uniformAmount || notification.shoesAmount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <div className="flex-shrink-0">
                                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;

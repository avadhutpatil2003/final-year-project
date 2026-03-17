import React, { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const Toast = ({ message, type = 'success', duration = 5000, onClose }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
            case 'warning':
                return <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" />;
            case 'error':
                return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />;
            case 'info':
            default:
                return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
        }
    };

    const backgroundColors = {
        success: 'bg-white border-l-4 border-green-500',
        warning: 'bg-white border-l-4 border-yellow-500',
        error: 'bg-white border-l-4 border-red-500',
        info: 'bg-white border-l-4 border-blue-500'
    };

    return (
        <div className={`fixed top-20 right-5 z-50 ${backgroundColors[type]} shadow-lg rounded-lg p-4 min-w-[320px] max-w-md animate-slideIn`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                        {message}
                    </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={onClose}
                        className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            {duration > 0 && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                    <div
                        className={`h-full ${type === 'success' ? 'bg-green-500' :
                                type === 'warning' ? 'bg-yellow-500' :
                                    type === 'error' ? 'bg-red-500' :
                                        'bg-blue-500'
                            } animate-progressBar`}
                        style={{ animationDuration: `${duration}ms` }}
                    />
                </div>
            )}
        </div>
    );
};

export default Toast;

import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  const containerClasses = `
    fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg
    ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
  `;

  return (
    <div className={containerClasses}>
      {isSuccess ? (
        <CheckCircleIcon className="h-6 w-6 mr-3" />
      ) : (
        <XCircleIcon className="h-6 w-6 mr-3" />
      )}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 -mr-2 p-1.5 rounded-full hover:bg-white/20">
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
};

export default Notification;

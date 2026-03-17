

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ isOpen, onClose, title, children, actions, size = 'default' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-md',
    default: 'max-w-3xl',
    large: 'max-w-6xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} m-4 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center space-x-2">
            {actions && (
              <div className="flex items-center space-x-2 mr-2">
                {actions}
              </div>
            )}
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

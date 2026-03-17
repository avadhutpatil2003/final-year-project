import React, { forwardRef } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const Textarea = forwardRef(({
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 4,
  className = '',
  ...props
}, ref) => {
  const textareaClasses = `
    w-full px-4 py-3 border rounded-lg transition-colors duration-200 resize-vertical
    ${error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
    }
    ${disabled 
      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
      : 'bg-white text-gray-900'
    }
    focus:ring-2 focus:ring-opacity-20 focus:outline-none
    ${className}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={textareaClasses}
          {...props}
        />
        
        {error && (
          <ExclamationCircleIcon className="absolute right-4 top-4 h-5 w-5 text-red-500" />
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;

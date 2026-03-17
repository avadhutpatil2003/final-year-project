import React, { forwardRef } from 'react';
import { ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const TimePicker = forwardRef(({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  min,
  max,
  step = "1",
  className = '',
  ...props
}, ref) => {
  const inputClasses = `
    w-full px-4 py-3 pr-12 border rounded-lg transition-colors duration-200
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
        <input
          ref={ref}
          type="time"
          value={value}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={inputClasses}
          {...props}
        />
        
        <ClockIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        
        {error && (
          <ExclamationCircleIcon className="absolute right-12 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
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

TimePicker.displayName = 'TimePicker';

export default TimePicker;

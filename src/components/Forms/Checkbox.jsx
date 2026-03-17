import React, { forwardRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

const Checkbox = forwardRef(({
  label,
  checked,
  onChange,
  error,
  helperText,
  disabled = false,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const checkboxClasses = `
    ${sizeClasses[size]} rounded border-2 transition-all duration-200 cursor-pointer
    ${error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
    }
    ${disabled 
      ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
      : checked 
        ? 'bg-primary-600 border-primary-600' 
        : 'bg-white hover:border-primary-300'
    }
    focus:ring-2 focus:ring-opacity-20 focus:outline-none
    ${className}
  `;

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={checkboxClasses}
            onClick={() => !disabled && onChange && onChange({ target: { checked: !checked } })}
          >
            {checked && (
              <CheckIcon className="h-full w-full text-white p-0.5" />
            )}
          </div>
        </div>
        
        {label && (
          <label 
            className={`text-sm font-medium cursor-pointer ${
              disabled ? 'text-gray-400' : 'text-gray-700'
            }`}
            onClick={() => !disabled && onChange && onChange({ target: { checked: !checked } })}
          >
            {label}
          </label>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 ml-8">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500 ml-8">{helperText}</p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;

import React, { forwardRef } from 'react';

const Toggle = forwardRef(({
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
    sm: {
      track: 'w-8 h-4',
      thumb: 'h-3 w-3',
      translate: 'translate-x-4'
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7'
    }
  };

  const trackClasses = `
    ${sizeClasses[size].track} relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer
    ${error 
      ? 'focus:ring-red-500' 
      : 'focus:ring-primary-500'
    }
    ${disabled 
      ? 'bg-gray-200 cursor-not-allowed' 
      : checked 
        ? 'bg-primary-600' 
        : 'bg-gray-300'
    }
    focus:ring-2 focus:ring-opacity-20 focus:outline-none
    ${className}
  `;

  const thumbClasses = `
    ${sizeClasses[size].thumb} bg-white rounded-full shadow-md transform transition-transform duration-200
    ${checked ? sizeClasses[size].translate : 'translate-x-0.5'}
  `;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <label className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {label}
          </label>
        )}
        
        <div className="relative">
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
            className={trackClasses}
            onClick={() => !disabled && onChange && onChange({ target: { checked: !checked } })}
          >
            <div className={thumbClasses}></div>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Toggle.displayName = 'Toggle';

export default Toggle;

import React, { forwardRef } from 'react';

const RadioButton = forwardRef(({
  name,
  options = [],
  value,
  onChange,
  label,
  error,
  helperText,
  disabled = false,
  direction = 'vertical',
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const containerClasses = direction === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-3';

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className={containerClasses}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const radioClasses = `
            ${sizeClasses[size]} rounded-full border-2 transition-all duration-200 cursor-pointer
            ${error 
              ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500' 
              : 'border-gray-300 focus-within:border-primary-500 focus-within:ring-primary-500'
            }
            ${disabled 
              ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
              : isSelected 
                ? 'bg-primary-600 border-primary-600' 
                : 'bg-white hover:border-primary-300'
            }
            focus-within:ring-2 focus-within:ring-opacity-20
            ${className}
          `;

          return (
            <div key={option.value} className="flex items-center space-x-3">
              <div className="relative flex items-center">
                <input
                  ref={ref}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={onChange}
                  disabled={disabled}
                  className="sr-only"
                  {...props}
                />
                <div className={radioClasses}>
                  {isSelected && (
                    <div className="h-full w-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
              
              <label 
                className={`text-sm font-medium cursor-pointer ${
                  disabled ? 'text-gray-400' : 'text-gray-700'
                }`}
                onClick={() => !disabled && onChange && onChange({ target: { value: option.value } })}
              >
                {option.label}
              </label>
            </div>
          );
        })}
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

RadioButton.displayName = 'RadioButton';

export default RadioButton;

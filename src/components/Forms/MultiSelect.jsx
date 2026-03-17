import React, { useState, forwardRef } from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const MultiSelect = forwardRef(({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    
    if (onChange) {
      onChange({ target: { value: newValue } });
    }
  };

  const handleRemoveOption = (optionValue) => {
    const newValue = value.filter(v => v !== optionValue);
    if (onChange) {
      onChange({ target: { value: newValue } });
    }
  };

  const getSelectedLabels = () => {
    return value.map(val => {
      const option = options.find(opt => opt.value === val);
      return option ? option.label : val;
    });
  };

  const selectClasses = `
    w-full min-h-[48px] px-4 py-3 border rounded-lg transition-colors duration-200 cursor-pointer
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
    <div className="space-y-2 relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div
          className={selectClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex flex-wrap gap-2 min-h-[20px]">
            {value.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              getSelectedLabels().map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {label}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOption(value[index]);
                      }}
                      className="ml-1 text-primary-600 hover:text-primary-800"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
        
        <ChevronDownIcon 
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
        
        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleToggleOption(option.value)}
                >
                  <div className={`w-5 h-5 mr-3 border-2 rounded flex items-center justify-center ${
                    isSelected 
                      ? 'bg-primary-600 border-primary-600' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <CheckIcon className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900">{option.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;

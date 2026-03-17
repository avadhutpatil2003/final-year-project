import React, { forwardRef } from 'react';

const RangeSlider = forwardRef(({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  error,
  helperText,
  disabled = false,
  showValue = true,
  className = '',
  ...props
}, ref) => {
  const sliderClasses = `
    w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {label}
          </label>
          {showValue && (
            <span className="text-sm font-medium text-primary-600">
              {value}
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={sliderClasses}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
          {...props}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
});

RangeSlider.displayName = 'RangeSlider';

export default RangeSlider;

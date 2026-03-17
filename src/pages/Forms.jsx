import React, { useState } from 'react';
import Input from '../components/Forms/Input';
import Select from '../components/Forms/Select';
import Textarea from '../components/Forms/Textarea';
import Checkbox from '../components/Forms/Checkbox';
import RadioButton from '../components/Forms/RadioButton';
import Toggle from '../components/Forms/Toggle';
import DatePicker from '../components/Forms/DatePicker';
import TimePicker from '../components/Forms/TimePicker';
import FileUpload from '../components/Forms/FileUpload';
import RangeSlider from '../components/Forms/RangeSlider';
import MultiSelect from '../components/Forms/MultiSelect';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  PhoneIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const Forms = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    bio: '',
    notifications: false,
    experience: 5,
    skills: [],
    shiftType: '',
    startDate: '',
    startTime: '',
    profilePicture: null,
    terms: false,
    priority: 'medium'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const departmentOptions = [
    { value: 'security', label: 'Security Department' },
    { value: 'admin', label: 'Administration' },
    { value: 'operations', label: 'Operations' },
    { value: 'maintenance', label: 'Maintenance' }
  ];

  const skillOptions = [
    { value: 'surveillance', label: 'Surveillance Systems' },
    { value: 'patrol', label: 'Security Patrol' },
    { value: 'emergency', label: 'Emergency Response' },
    { value: 'access_control', label: 'Access Control' },
    { value: 'investigation', label: 'Investigation' },
    { value: 'crowd_control', label: 'Crowd Control' }
  ];

  const shiftOptions = [
    { value: 'morning', label: 'Morning Shift (6 AM - 2 PM)' },
    { value: 'evening', label: 'Evening Shift (2 PM - 10 PM)' },
    { value: 'night', label: 'Night Shift (10 PM - 6 AM)' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.terms) newErrors.terms = 'You must accept the terms and conditions';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted:', formData);
      alert('Form submitted successfully!');
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Form Elements</h1>
        <p className="text-gray-600 mt-1">Comprehensive form components for your security management system</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Input Fields */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Input Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={errors.name}
              required
              icon={UserIcon}
            />
            
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              required
              icon={EnvelopeIcon}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              required
              icon={LockClosedIcon}
              helperText="Password must be at least 8 characters"
            />
            
            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              icon={PhoneIcon}
            />
          </div>
        </div>

        {/* Select Fields */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Department"
              options={departmentOptions}
              value={formData.department}
              onChange={handleInputChange('department')}
              error={errors.department}
              required
              placeholder="Select your department"
            />
            
            <MultiSelect
              label="Skills & Expertise"
              options={skillOptions}
              value={formData.skills}
              onChange={handleInputChange('skills')}
              placeholder="Select your skills"
              helperText="Select all applicable skills"
            />
          </div>
        </div>

        {/* Textarea */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Text Area</h2>
          <Textarea
            label="Bio / Description"
            placeholder="Tell us about yourself..."
            value={formData.bio}
            onChange={handleInputChange('bio')}
            rows={4}
            helperText="Brief description of your background and experience"
          />
        </div>

        {/* Radio Buttons */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Radio Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RadioButton
              name="shiftType"
              label="Preferred Shift"
              options={shiftOptions}
              value={formData.shiftType}
              onChange={handleInputChange('shiftType')}
              direction="vertical"
            />
            
            <RadioButton
              name="priority"
              label="Priority Level"
              options={priorityOptions}
              value={formData.priority}
              onChange={handleInputChange('priority')}
              direction="horizontal"
            />
          </div>
        </div>

        {/* Checkboxes and Toggles */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Checkboxes & Toggles</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Checkboxes</h3>
                <Checkbox
                  label="I accept the terms and conditions"
                  checked={formData.terms}
                  onChange={handleInputChange('terms')}
                  error={errors.terms}
                />
                <Checkbox
                  label="Subscribe to newsletter"
                  checked={formData.newsletter}
                  onChange={handleInputChange('newsletter')}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Toggle Switches</h3>
                <Toggle
                  label="Email Notifications"
                  checked={formData.notifications}
                  onChange={handleInputChange('notifications')}
                  helperText="Receive notifications via email"
                />
                <Toggle
                  label="SMS Alerts"
                  checked={formData.smsAlerts}
                  onChange={handleInputChange('smsAlerts')}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Date and Time Pickers */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Date & Time Pickers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={handleInputChange('startDate')}
              helperText="Select your preferred start date"
            />
            
            <TimePicker
              label="Start Time"
              value={formData.startTime}
              onChange={handleInputChange('startTime')}
              helperText="Select your preferred start time"
            />
          </div>
        </div>

        {/* Range Slider */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Range Slider</h2>
          <RangeSlider
            label="Years of Experience"
            value={formData.experience}
            onChange={handleInputChange('experience')}
            min={0}
            max={20}
            step={1}
            helperText="Select your years of security experience"
          />
        </div>

        {/* File Upload */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">File Upload</h2>
          <FileUpload
            label="Profile Picture"
            accept="image/*"
            onFileSelect={(file) => setFormData(prev => ({ ...prev, profilePicture: file }))}
            helperText="Upload your profile picture (JPG, PNG, GIF)"
            maxSize={2 * 1024 * 1024} // 2MB
          />
        </div>

        {/* Form Actions */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  phone: '',
                  department: '',
                  bio: '',
                  notifications: false,
                  experience: 5,
                  skills: [],
                  shiftType: '',
                  startDate: '',
                  startTime: '',
                  profilePicture: null,
                  terms: false,
                  priority: 'medium'
                });
                setErrors({});
              }}
            >
              Reset Form
            </button>
            <button type="submit" className="btn-primary">
              Submit Form
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Forms;

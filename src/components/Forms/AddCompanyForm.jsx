import React, { useState, useEffect } from 'react';
import Input from './Input';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  GlobeAltIcon,
  HashtagIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AddCompanyForm = ({ onAdd, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    registrationDate: new Date().toISOString().split('T')[0],
    employeeSalary: '',
    shift: '8 Hours'
  });

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        contactPerson: initialData.contactPerson || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        gstNumber: initialData.gstNumber || '',
        registrationDate: initialData.registrationDate || new Date().toISOString().split('T')[0],
        employeeSalary: initialData.employeeSalary || '',
        shift: initialData.shift || '8 Hours'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name) {
      alert('Please fill in the required field: Company Name.');
      return;
    }

    // Validate phone number format only if phone is provided
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone)) {
        alert('Please enter a valid phone number (10 digits)');
        return;
      }
    }

    // Call the onAdd function with form data
    onAdd({
      ...formData,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input label="Company Name" id="name" value={formData.name} onChange={handleChange} placeholder="Enter company name" required icon={BuildingOfficeIcon} />
          </div>
          <div className="md:col-span-2">
            <Input label="Address" id="address" value={formData.address} onChange={handleChange} placeholder="Enter full address" icon={MapPinIcon} />
          </div>
          <Input label="City" id="city" value={formData.city} onChange={handleChange} placeholder="Enter city" icon={GlobeAltIcon} />
          <Input label="State" id="state" value={formData.state} onChange={handleChange} placeholder="Enter state" icon={GlobeAltIcon} />
          <Input label="Pincode" id="pincode" value={formData.pincode} onChange={handleChange} placeholder="Enter 6-digit pincode" icon={HashtagIcon} />
          <Input label="GST Number" id="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="Enter GST number (optional)" icon={IdentificationIcon} />
          <Input label="Agreement Rate" id="employeeSalary" type="number" step="0.01" value={formData.employeeSalary} onChange={handleChange} placeholder="Enter agreement rate" icon={CurrencyDollarIcon} />
          <Input label="Registration Date" id="registrationDate" type="date" value={formData.registrationDate} onChange={handleChange} icon={CalendarDaysIcon} />

          {/* Shift Dropdown */}
          <div className="md:col-span-2">
            <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                Work Shift
              </div>
            </label>
            <select
              id="shift"
              value={formData.shift}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
            >
              <option value="8 Hours">8 Hours</option>
              <option value="9 Hours">9 Hours</option>
              <option value="10 Hours">10 Hours</option>
              <option value="11 Hours">11 Hours</option>
              <option value="12 Hours">12 Hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Person Details (Optional)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Contact Person (Optional)" id="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder="Enter contact person's name" icon={UserIcon} />
          <Input label="Phone Number (Optional)" id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter 10-digit phone number" icon={PhoneIcon} />
          <div className="md:col-span-2">
            <Input label="Email Address (Optional)" id="email" type="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" icon={EnvelopeIcon} />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initialData ? 'Update Company' : 'Add Company'}
        </button>
      </div>
    </form>
  );
};

export default AddCompanyForm;

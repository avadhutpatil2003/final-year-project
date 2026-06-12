import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import Input from '../Forms/Input';
import {
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';

const AddSupervisorForm = ({ onAdd, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    joiningDate: '',
    salary: '',
    password: '',
    assignedCompany: 'all'
  });

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // Fetch companies from Firestore
  useEffect(() => {
    const companiesRef = collection(db, 'companies');
    let q;
    try {
      q = query(companiesRef, orderBy('name', 'asc'));
    } catch {
      q = companiesRef;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const companyData = snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name || 'Unknown Company', ...doc.data() }));
        setCompanies(companyData);
        setLoadingCompanies(false);
      },
      (error) => {
        console.error('Error fetching companies:', error);
        setLoadingCompanies(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      // Convert Firestore Timestamp to date string if needed
      const formatDate = (dateValue) => {
        if (!dateValue) return '';
        // If it's a Firestore Timestamp
        if (dateValue.toDate) {
          return dateValue.toDate().toISOString().split('T')[0];
        }
        // If it's a Date string
        if (typeof dateValue === 'string') {
          return dateValue.split('T')[0];
        }
        return dateValue;
      };

      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        joiningDate: formatDate(initialData.joiningDate) || '',
        salary: initialData.salary || '',
        password: initialData.password || '',
        assignedCompany: initialData.assignedCompany || 'all'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      alert('Please fill in all required fields');
      return;
    }
    onAdd(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input label="Full Name" id="name" value={formData.name} onChange={handleChange} placeholder="Enter supervisor's full name" required icon={UserIcon} />
          </div>
          <div className="md:col-span-2">
            <Input label="Address" id="address" value={formData.address} onChange={handleChange} placeholder="Enter full address" icon={MapPinIcon} />
          </div>
          <Input label="City" id="city" value={formData.city} onChange={handleChange} placeholder="Enter city" icon={GlobeAltIcon} />
          <Input label="State" id="state" value={formData.state} onChange={handleChange} placeholder="Enter state" icon={GlobeAltIcon} />
          <Input label="Pincode" id="pincode" value={formData.pincode} onChange={handleChange} placeholder="Enter 6-digit pincode" icon={HashtagIcon} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Phone Number" id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter 10-digit phone number" required icon={PhoneIcon} />
          <Input label="Email Address" id="email" type="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" required icon={EnvelopeIcon} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Employment Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Date of Joining (Optional)" id="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} icon={CalendarDaysIcon} />
          <Input label="Salary" id="salary" value={formData.salary} onChange={handleChange} placeholder="Enter salary amount" icon={IdentificationIcon} />
          <div className="flex flex-col">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Login Password</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter login password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="assignedCompany" className="block text-sm font-medium text-gray-700 mb-1">Assign Company</label>
            <div className="relative">
              <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="assignedCompany"
                value={formData.assignedCompany}
                onChange={handleChange}
                className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
                required
              >
                <option value="all">Assign to All Companies</option>
                {loadingCompanies ? (
                  <option value="">Loading companies...</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initialData ? 'Update Supervisor' : 'Add Supervisor'}
        </button>
      </div>
    </form>
  );
};

export default AddSupervisorForm;

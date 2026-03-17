import React, { useState, useEffect } from 'react';
import DataTable from '../components/Table/DataTable';
import Modal from '../components/Modal/Modal';
import AddEmployeeForm from '../components/Forms/AddEmployeeForm';
import AddCompanyForm from '../components/Forms/AddCompanyForm';
import Notification from '../components/widgets/Notification';
import { PlusIcon } from '@heroicons/react/24/outline';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../services/api';

// Tab component
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 ${
      active 
        ? 'bg-white text-blue-600 border-t-2 border-blue-600' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);

const TABS = {
  EMPLOYEES: 'employees',
  COMPANIES: 'companies'
};

const Stocks = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(TABS.EMPLOYEES);
  
  // Employees state
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  
  // Companies state
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  
  // Common state
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Employee handlers
  const handleAddEmployee = async (newEmployee) => {
    try {
      let photoUrl = newEmployee.photo;
      
      if (newEmployee.photo && newEmployee.photo instanceof File) {
        photoUrl = await api.uploadImage(newEmployee.photo);
      }

      const employeeData = { 
        ...newEmployee,
        photo: photoUrl,
        status: newEmployee.status || 'on_duty',
        joiningDate: newEmployee.joiningDate || new Date()
      };

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, employeeData);
        setNotification({ show: true, message: 'Employee updated successfully!', type: 'success' });
        setIsEditEmployeeModalOpen(false);
      } else {
        await api.addEmployee(employeeData);
        setIsEmployeeModalOpen(false);
        setNotification({ show: true, message: 'Employee added successfully!', type: 'success' });
      }
      
      setEditingEmployee(null);
    } catch (error) {
      console.error("Error saving employee: ", error);
      setNotification({ 
        show: true, 
        message: `Failed to ${editingEmployee ? 'update' : 'add'} employee: ` + error.message, 
        type: 'error' 
      });
    }
  };
  
  // Company handlers
  const handleAddCompany = async (newCompany) => {
    try {
      if (editingCompany) {
        await api.updateCompany(editingCompany.id, newCompany);
        setNotification({ show: true, message: 'Company updated successfully!', type: 'success' });
        setIsEditCompanyModalOpen(false);
      } else {
        await api.addCompany(newCompany);
        setIsCompanyModalOpen(false);
        setNotification({ show: true, message: 'Company added successfully!', type: 'success' });
      }
      
      setEditingCompany(null);
    } catch (error) {
      console.error("Error saving company: ", error);
      setNotification({ 
        show: true, 
        message: `Failed to ${editingCompany ? 'update' : 'add'} company: ` + error.message, 
        type: 'error' 
      });
    }
  };

  // Employee actions
  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setIsEditEmployeeModalOpen(true);
  };

  const handleDeleteEmployee = async (employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      try {
        await api.deleteEmployee(employee.id, employee.photo);
        setNotification({ 
          show: true, 
          message: 'Employee deleted successfully!', 
          type: 'success' 
        });
        
        setEmployees(prevEmployees => 
          prevEmployees.filter(emp => emp.id !== employee.id)
        );
        
      } catch (error) {
        console.error('Error deleting employee:', error);
        setNotification({ 
          show: true, 
          message: 'Failed to delete employee: ' + error.message, 
          type: 'error' 
        });
      }
    }
  };
  
  // Company actions
  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setIsEditCompanyModalOpen(true);
  };

  const handleDeleteCompany = async (company) => {
    if (window.confirm(`Are you sure you want to delete ${company.name}?`)) {
      try {
        await api.deleteCompany(company.id);
        setNotification({ 
          show: true, 
          message: 'Company deleted successfully!', 
          type: 'success' 
        });
        
        setCompanies(prevCompanies => 
          prevCompanies.filter(comp => comp.id !== company.id)
        );
        
      } catch (error) {
        console.error('Error deleting company:', error);
        setNotification({ 
          show: true, 
          message: 'Failed to delete company: ' + error.message, 
          type: 'error' 
        });
      }
    }
  };
  
  const handleCancel = () => {
    setIsEmployeeModalOpen(false);
    setIsEditEmployeeModalOpen(false);
    setIsCompanyModalOpen(false);
    setIsEditCompanyModalOpen(false);
    setEditingEmployee(null);
    setEditingCompany(null);
  };

  useEffect(() => {
    const employeesRef = collection(db, 'employees');
    const q = query(employeesRef, orderBy('joiningDate', 'desc'));
    
    const unsubscribeEmployees = onSnapshot(q, 
      (querySnapshot) => {
        const employeeData = [];
        querySnapshot.forEach((doc) => {
          employeeData.push({ id: doc.id, ...doc.data() });
        });
        setEmployees(employeeData);
        setEmployeesLoading(false);
      },
      (error) => {
        console.error('Error fetching employees:', error);
        setNotification({ 
          show: true, 
          message: 'Error loading employees: ' + error.message, 
          type: 'error' 
        });
        setEmployeesLoading(false);
      }
    );

    return () => unsubscribeEmployees();
  }, []);

  useEffect(() => {
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeCompanies = onSnapshot(q, 
      (querySnapshot) => {
        const companyData = [];
        querySnapshot.forEach((doc) => {
          companyData.push({ id: doc.id, ...doc.data() });
        });
        setCompanies(companyData);
        setCompaniesLoading(false);
      },
      (error) => {
        console.error('Error fetching companies:', error);
        setNotification({ 
          show: true, 
          message: 'Error loading companies: ' + error.message, 
          type: 'error' 
        });
        setCompaniesLoading(false);
      }
    );

    return () => unsubscribeCompanies();
  }, []);

  const employeeColumns = [
    {
      key: 'photo',
      label: 'Photo',
      render: (photo, item) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {photo ? (
              <img src={photo} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
        </div>
      )
    },
    { 
      key: 'name', 
      label: 'Name',
      render: (name, item) => (
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          {item.aadhar && <div className="text-sm text-gray-500">Aadhar: {item.aadhar}</div>}
        </div>
      )
    },
    { 
      key: 'role', 
      label: 'Position',
      render: (role) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {role || 'N/A'}
        </span>
      )
    },
    { 
      key: 'phone', 
      label: 'Phone',
      render: (phone) => phone || 'N/A'
    },
    { 
      key: 'email', 
      label: 'Email',
      render: (email) => email || 'N/A'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (status) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          status === 'on_duty' ? 'bg-green-100 text-green-800' : 
          status === 'off_duty' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {status === 'on_duty' ? 'On Duty' : status === 'off_duty' ? 'Off Duty' : status || 'N/A'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditEmployee(item);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEmployee(item);
            }}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  const companyColumns = [
    { key: 'name', label: 'Company Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex items-center space-x-3">
          <button 
            className="relative inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 hover:shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              handleEditCompany(item);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
          <button 
            className="relative inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md group hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 hover:shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCompany(item);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove</span>
          </button>
        </div>
      )
    }
  ];

  const isLoading = activeTab === TABS.EMPLOYEES ? employeesLoading : companiesLoading;
  const data = activeTab === TABS.EMPLOYEES ? employees : companies;
  const columns = activeTab === TABS.EMPLOYEES ? employeeColumns : companyColumns;
  const title = activeTab === TABS.EMPLOYEES ? 'Employee Directory' : 'Company Directory';
  const addButtonLabel = activeTab === TABS.EMPLOYEES ? 'Add Employee' : 'Add Company';
  const handleAddClick = activeTab === TABS.EMPLOYEES 
    ? () => setIsEmployeeModalOpen(true) 
    : () => setIsCompanyModalOpen(true);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* Header with title and add button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            {addButtonLabel}
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <TabButton 
              active={activeTab === TABS.EMPLOYEES}
              onClick={() => setActiveTab(TABS.EMPLOYEES)}
            >
              Employees
            </TabButton>
            <TabButton 
              active={activeTab === TABS.COMPANIES}
              onClick={() => setActiveTab(TABS.COMPANIES)}
            >
              Companies
            </TabButton>
          </nav>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <DataTable
            data={data}
            columns={columns}
            searchable={true}
            sortable={true}
            pagination={true}
            itemsPerPage={10}
          />
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      <Modal 
        isOpen={isEmployeeModalOpen || isEditEmployeeModalOpen} 
        onClose={handleCancel} 
        title={`${editingEmployee ? 'Edit' : 'Add New'} Employee`}
      >
        <AddEmployeeForm 
          onAdd={handleAddEmployee} 
          onCancel={handleCancel} 
          initialData={editingEmployee}
        />
      </Modal>

      {/* Add/Edit Company Modal */}
      <Modal 
        isOpen={isCompanyModalOpen || isEditCompanyModalOpen} 
        onClose={handleCancel} 
        title={`${editingCompany ? 'Edit' : 'Add New'} Company`}
      >
        <AddCompanyForm 
          onAdd={handleAddCompany} 
          onCancel={handleCancel} 
          initialData={editingCompany}
        />
      </Modal>

      {/* Notification */}
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: '', type: '' })}
        />
      )}
    </div>
  );
};

export default Stocks;

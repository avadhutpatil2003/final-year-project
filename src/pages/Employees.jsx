import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
  EyeIcon,
  PrinterIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import AddEmployeeForm from '../components/Forms/AddEmployeeForm';
import Modal from '../components/Modal/Modal';
import DataTable from '../components/Table/DataTable';
import Notification from '../components/widgets/Notification';
import { api } from '../services/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: ''
  });

  // 🔹 Fetch employees from Firestore
  useEffect(() => {
    console.log('🔄 Starting employee data fetch...');
    setLoading(true);
    setError(null);

    const employeesRef = collection(db, 'employees');
    let q;

    try {
      q = query(employeesRef, orderBy('createdAt', 'desc'));
    } catch (orderError) {
      console.warn('⚠️ OrderBy failed, using basic query:', orderError);
      q = employeesRef;
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('📊 Received employee data, docs count:', querySnapshot.size);
        const employeeData = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('👤 Employee doc:', doc.id, data);
          employeeData.push({
            id: doc.id,
            ...data,
          });
        });

        console.log('✅ Final employee data:', employeeData);
        setEmployees(employeeData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('❌ Error fetching employees:', error);
        
        // Handle permission errors
        if (error.code === 'permission-denied') {
          console.warn('⚠️ Firestore Rules issue detected.');
          console.warn('📝 Fix: Update Firestore Rules in Firebase Console');
          console.warn('📖 Guide: See FIRESTORE_RULES_DEPLOYMENT.md');
          setError('Permission Denied - Update Firestore Rules (see console)');
          setEmployees([]);
        } else {
          setError(error.message);
        }
        
        setLoading(false);
        setNotification({
          show: true,
          message: `Error loading employees: ${error.message}`,
          type: 'error'
        });
      }
    );

    return unsubscribe;
  }, []);

  // 🔹 Add / Update Employee
  const handleAddEmployee = async (newEmployee) => {
    setIsModalOpen(false);
    setEditingEmployee(null);

    try {
      let photoUrl = newEmployee.photo;
      if (newEmployee.photo && newEmployee.photo instanceof File) {
        photoUrl = await api.uploadImage(newEmployee.photo);
      }

      const employeeData = {
        ...newEmployee,
        photo: photoUrl,
        status: newEmployee.status || 'on_duty',
        joiningDate: newEmployee.joiningDate || new Date(),
        createdAt: newEmployee.createdAt || new Date(),
      };

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, employeeData);
        setNotification({
          show: true,
          message: 'Employee updated successfully!',
          type: 'success',
        });
      } else {
        await api.addEmployee(employeeData);
        setNotification({
          show: true,
          message: 'Employee added successfully!',
          type: 'success',
        });
      }
    } catch (error) {
      setNotification({
        show: true,
        message: `Failed to save employee: ${error.message}`,
        type: 'error',
      });
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  // 🔹 View Employee Details
  const handleDisplayEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedEmployee(null);
  };

  // 🔹 Print Employee Details
  const handlePrintEmployee = (employee) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Employee Details - ${employee.name || 'Unknown'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .section { 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #2563eb;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .field-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            .field { 
              margin-bottom: 10px; 
            }
            .label { 
              font-weight: bold; 
              display: block;
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 2px;
            }
            .value { 
              display: block;
              font-size: 16px;
              color: #111827;
            }
            .full-width {
              grid-column: 1 / -1;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Employee Details Report</h1>
            <p><strong>Employee:</strong> ${employee.name || 'N/A'}</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Employee Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${employee.name || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Date of Birth:</span>
                <span class="value">${employee.dob || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Phone Number:</span>
                <span class="value">${employee.phone || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${employee.email || 'N/A'}</span>
              </div>
              <div class="field full-width">
                <span class="label">Address:</span>
                <span class="value">${employee.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Nominee Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Nominee Name:</span>
                <span class="value">${employee.nomineeName || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Nominee Relation:</span>
                <span class="value">${employee.nomineeRelation || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Nominee Aadhar No:</span>
                <span class="value">${employee.nomineeAadhar || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Nominee Contact:</span>
                <span class="value">${employee.nomineeContact || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Bank Details</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Bank Account Number:</span>
                <span class="value">${employee.bankAccount || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">IFSC Code:</span>
                <span class="value">${employee.bankIfsc || employee.bankIFSC || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Bank Name:</span>
                <span class="value">${employee.bankName || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Bank Address:</span>
                <span class="value">${employee.bankAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Employment Details</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Date of Joining:</span>
                <span class="value">${employee.joiningDate ? (employee.joiningDate.toDate ? new Date(employee.joiningDate.toDate()).toLocaleDateString('en-IN') : new Date(employee.joiningDate).toLocaleDateString('en-IN')) : 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Work Shift:</span>
                <span class="value">${employee.shift || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Monthly Salary:</span>
                <span class="value">₹${employee.salary ? parseFloat(employee.salary).toLocaleString('en-IN') : '0'}</span>
              </div>
              <div class="field">
                <span class="label">Daily Salary Rate:</span>
                <span class="value">₹${employee.salary ? (parseFloat(employee.salary) / 30).toFixed(2) : '0'}/day</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Registration Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Registration Date:</span>
                <span class="value">${employee.createdAt ? new Date(employee.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // 🔹 Download Employee Details as PDF
  const handleDownloadEmployee = (employee) => {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Employee Details - ${employee.name || 'Unknown'}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .section { 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #2563eb;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .field-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            .field { 
              margin-bottom: 10px; 
            }
            .label { 
              font-weight: bold; 
              display: block;
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 2px;
            }
            .value { 
              display: block;
              font-size: 16px;
              color: #111827;
            }
            .full-width {
              grid-column: 1 / -1;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Employee Details Report</h1>
            <p><strong>Employee:</strong> ${employee.name || 'N/A'}</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Employee Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${employee.name || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Date of Birth:</span>
                <span class="value">${employee.dob || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Phone Number:</span>
                <span class="value">${employee.phone || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${employee.email || 'N/A'}</span>
              </div>
              <div class="field full-width">
                <span class="label">Address:</span>
                <span class="value">${employee.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Nominee Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Nominee Name:</span>
                <span class="value">${employee.nomineeName || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Nominee Relation:</span>
                <span class="value">${employee.nomineeRelation || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Nominee Aadhar No:</span>
                <span class="value">${employee.nomineeAadhar || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Nominee Contact:</span>
                <span class="value">${employee.nomineeContact || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Bank Details</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Bank Account Number:</span>
                <span class="value">${employee.bankAccount || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">IFSC Code:</span>
                <span class="value">${employee.bankIfsc || employee.bankIFSC || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Bank Name:</span>
                <span class="value">${employee.bankName || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Bank Address:</span>
                <span class="value">${employee.bankAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Employment Details</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Date of Joining:</span>
                <span class="value">${employee.joiningDate ? (employee.joiningDate.toDate ? new Date(employee.joiningDate.toDate()).toLocaleDateString('en-IN') : new Date(employee.joiningDate).toLocaleDateString('en-IN')) : 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Work Shift:</span>
                <span class="value">${employee.shift || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Monthly Salary:</span>
                <span class="value">₹${employee.salary ? parseFloat(employee.salary).toLocaleString('en-IN') : '0'}</span>
              </div>
              <div class="field">
                <span class="label">Daily Salary Rate:</span>
                <span class="value">₹${employee.salary ? (parseFloat(employee.salary) / 30).toFixed(2) : '0'}/day</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Registration Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="label">Registration Date:</span>
                <span class="value">${employee.createdAt ? new Date(employee.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create blob and download as HTML file (which can be opened and saved as PDF)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_${employee.name?.replace(/\s+/g, '_') || employee.id || 'data'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Show notification to user
    alert('Employee details downloaded as HTML file. You can open it in browser and save as PDF using Ctrl+P → Save as PDF');
  };

  // 🔹 Edit Employee
  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  // 🔹 Delete Employee
  const handleDeleteEmployee = async (employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      try {
        await api.deleteEmployee(employee.id, employee.photo);
        setNotification({
          show: true,
          message: 'Employee deleted successfully!',
          type: 'success',
        });
      } catch (error) {
        setNotification({
          show: true,
          message: 'Failed to delete employee: ' + error.message,
          type: 'error',
        });
      }
    }
  };

  // 🔹 Columns
  const employeeColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (name, item) => (
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{item.email}</div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone' },
    { key: 'aadhar', label: 'Aadhar' },
    {
      key: 'nomineeName',
      label: 'Nominee Name',
      render: (nomineeName, item) => (
        <div>
          <div className="font-medium text-gray-900">{nomineeName || 'N/A'}</div>
          <div className="text-sm text-gray-500">{item.nomineeRelation || ''}</div>
        </div>
      ),
    },
    { key: 'nomineeContact', label: 'Nominee Contact' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDisplayEmployee(item);
            }}
            className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700"
            title="View Details"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditEmployee(item);
            }}
            className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
            title="Edit"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEmployee(item);
            }}
            className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span>Add Employee</span>
        </button>
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="card p-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Employees</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && employees.length === 0 && (
        <div className="card p-8 text-center">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first employee.</p>
          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsModalOpen(true);
            }}
            className="btn-primary"
          >
            Add First Employee
          </button>
        </div>
      )}

      {/* Data Table - Only show when we have data */}
      {!loading && !error && employees.length > 0 && (
        <DataTable
          data={employees}
          columns={employeeColumns}
          title="Employee Directory"
          searchable={true}
          sortable={true}
          pagination={true}
          itemsPerPage={10}
        />
      )}

      {/* 🔸 Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
      >
        <AddEmployeeForm onAdd={handleAddEmployee} onCancel={handleCancel} initialData={editingEmployee} />
      </Modal>

      {/* 🔸 View Details Modal */}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title="Employee Details"
      >
        {selectedEmployee && (
          <div className="space-y-6">
            {/* 🔹 Employee Basic Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employee Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.name || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.dob || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.phone || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.email || 'N/A'}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* 🔹 Nominee Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nominee Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nominee Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.nomineeName || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Nominee Relation</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.nomineeRelation || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Nominee Aadhar No</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.nomineeAadhar || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Nominee Contact</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.nomineeContact || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* 🔹 Bank Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Bank Account Number</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.bankAccount || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">IFSC Code</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.bankIfsc || selectedEmployee.bankIFSC || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Bank Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.bankName || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Bank Address</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.bankAddress || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* 🔹 Employment Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date of Joining</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedEmployee.joiningDate
                      ? (selectedEmployee.joiningDate.toDate
                        ? new Date(selectedEmployee.joiningDate.toDate()).toLocaleDateString('en-IN')
                        : new Date(selectedEmployee.joiningDate).toLocaleDateString('en-IN'))
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Work Shift</p>
                  <p className="text-base font-medium text-gray-900">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedEmployee.shift || 'N/A'}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">8 Hours Shift Payment</p>
                  <p className="text-base font-medium text-green-600">
                    ₹{selectedEmployee.salary8Hours ? parseFloat(selectedEmployee.salary8Hours).toLocaleString('en-IN') : '0'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">12 Hours Shift Payment</p>
                  <p className="text-base font-medium text-green-600">
                    ₹{selectedEmployee.salary12Hours ? parseFloat(selectedEmployee.salary12Hours).toLocaleString('en-IN') : '0'}
                  </p>
                </div>
              </div>
            </div>

            {/* 🔹 ESI & Financial Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ESI & Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ESI Number</p>
                  <p className="text-base font-medium text-gray-900">{selectedEmployee.esiNumber || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Advance Amount</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedEmployee.advance ? `₹${parseFloat(selectedEmployee.advance).toLocaleString('en-IN')}` : '₹0'}
                  </p>
                </div>
              </div>
            </div>

            {/* 🔹 Registration Info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Registration Info</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePrintEmployee(selectedEmployee)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Print Employee Details"
                  >
                    <PrinterIcon className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => handleDownloadEmployee(selectedEmployee)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Download Employee Details"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Registration Date</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedEmployee.createdAt
                      ? new Date(selectedEmployee.createdAt.seconds * 1000).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

// 🔹 Helper Component
const Info = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-gray-700">{label}</p>
    <p className="text-gray-900">{value || 'N/A'}</p>
  </div>
);

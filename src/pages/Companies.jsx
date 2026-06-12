import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PencilSquareIcon, TrashIcon, PlusIcon, EyeIcon, PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import AddCompanyForm from '../components/Forms/AddCompanyForm';
import Modal from '../components/Modal/Modal.jsx';
import DataTable from '../components/Table/DataTable.jsx';
import Notification from '../components/widgets/Notification';
import { api } from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showDataTable, setShowDataTable] = useState(false);

  const companyColumns = [
    { 
      key: 'name', 
      label: 'Company Name',
      render: (name, item) => (
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          {item.registrationNumber && <div className="text-sm text-gray-500">Reg: {item.registrationNumber}</div>}
        </div>
      )
    },
    { 
      key: 'registrationDate', 
      label: 'Registration Date',
      render: (registrationDate) => registrationDate || 'N/A'
    },
    { 
      key: 'employeeSalary', 
      label: 'Agreement Rate',
      render: (employeeSalary) => employeeSalary ? `₹${employeeSalary}` : 'N/A'
    },
    { 
      key: 'address', 
      label: 'Location',
      render: (_, item) => (
        <div>
          {item.city && <div className="text-sm">{item.city}{item.state ? `, ${item.state}` : ''}</div>}
          {item.country && <div className="text-xs text-gray-500">{item.country}</div>}
        </div>
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
              handleDisplayCompany(item);
            }}
            className="p-2 rounded-full bg-green-700 text-white hover:bg-green-800 hover:shadow-lg transition-all duration-200 shadow-md"
            title="Display Details"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditCompany(item);
            }}
            className="p-2 rounded-full bg-blue-700 text-white hover:bg-blue-800 hover:shadow-lg transition-all duration-200 shadow-md"
            title="Edit"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCompany(item);
            }}
            className="p-2 rounded-full bg-red-700 text-white hover:bg-red-800 hover:shadow-lg transition-all duration-200 shadow-md"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ];

  // Fetch companies from Firestore
  useEffect(() => {
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const companyData = [];
        querySnapshot.forEach((doc) => {
          companyData.push({ id: doc.id, ...doc.data() });
        });
        setCompanies(companyData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching companies:', error);
        setNotification({ 
          show: true, 
          message: 'Error loading companies: ' + error.message, 
          type: 'error' 
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 🔹 Calculate day-wise salary from monthly salary
  const calculateDayWiseSalary = (monthlySalary) => {
    if (!monthlySalary || monthlySalary <= 0) return 0;
    // Assuming 30 days in a month for calculation
    return Math.round(monthlySalary / 30);
  };

  // 🔹 Calculate hourly salary from day-wise salary
  const calculateHourlyWiseSalary = (dayWiseSalary, shiftHours = 8) => {
    if (!dayWiseSalary || dayWiseSalary <= 0) return 0;
    // Extract number from shift string (e.g., "8 Hours" -> 8)
    const hours = typeof shiftHours === 'string' ? parseInt(shiftHours.split(' ')[0]) : shiftHours;
    return Math.round(dayWiseSalary / hours);
  };



  const handleAddCompany = async (newCompany) => {
    try {
      console.log('Adding company:', newCompany);
      
      // Validate required fields
      if (!newCompany.name) {
        throw new Error('Please enter the company name.');
      }

      // Calculate day-wise and hourly salary if employee salary is provided
      const dayWiseSalary = newCompany.employeeSalary ? calculateDayWiseSalary(parseFloat(newCompany.employeeSalary)) : 0;
      const hourlyWiseSalary = dayWiseSalary > 0 ? calculateHourlyWiseSalary(dayWiseSalary, newCompany.shift || '8 Hours') : 0;
      
      // Log calculation for verification
      if (newCompany.employeeSalary) {
        const shiftHours = parseInt((newCompany.shift || '8 Hours').split(' ')[0]);
        console.log(`🧮 Salary Calculation:
          Monthly Salary: ₹${newCompany.employeeSalary}
          Day-wise Salary: ₹${dayWiseSalary} (${newCompany.employeeSalary} ÷ 30 = ${dayWiseSalary})
          Hourly Salary: ₹${hourlyWiseSalary} (${dayWiseSalary} ÷ ${shiftHours} hours = ${hourlyWiseSalary})`);
      }

      const companyData = { 
        name: newCompany.name,
        contactPerson: newCompany.contactPerson,
        phone: newCompany.phone,
        email: newCompany.email || '',
        address: newCompany.address || '',
        city: newCompany.city || '',
        state: newCompany.state || '',
        pincode: newCompany.pincode || '',
        gstNumber: newCompany.gstNumber || '',
        registrationDate: newCompany.registrationDate || new Date().toISOString().split('T')[0],
        employeeSalary: newCompany.employeeSalary || '',
        dayWiseSalary: dayWiseSalary,
        hourlyWiseSalary: hourlyWiseSalary,
        shift: newCompany.shift || '8 Hours',
        createdAt: new Date().toISOString()
      };

      console.log('💾 Saving company data to Firebase:', companyData);

      if (editingCompany) {
        await api.updateCompany(editingCompany.id, companyData);
        console.log('✅ Company updated in Firebase successfully');
        setNotification({ 
          show: true, 
          message: `Company updated successfully! ${dayWiseSalary > 0 ? `Day-wise: ₹${dayWiseSalary}, Hourly: ₹${hourlyWiseSalary}` : ''}`, 
          type: 'success' 
        });
      } else {
        await api.addCompany(companyData);
        console.log('✅ Company added to Firebase successfully');
        setNotification({ 
          show: true, 
          message: `Company added successfully! ${dayWiseSalary > 0 ? `Day-wise: ₹${dayWiseSalary}, Hourly: ₹${hourlyWiseSalary}` : ''}`, 
        type: 'success' 
        });
        setShowDataTable(true);
      }
      
      // Reset form and close modal
      setIsModalOpen(false);
      setEditingCompany(null);
      
    } catch (error) {
      console.error('Error saving company:', error);
      setNotification({ 
        show: true, 
        message: error.message || 'An error occurred while adding the company .', 
        type: 'error' 
      });
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
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
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleDisplayCompany = (company) => {
    setSelectedCompany(company);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCompany(null);
  };

  // Print company details
  const handlePrintCompany = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Company Details - ${selectedCompany.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1f2937; }
          .firm-name { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
          .firm-info { font-size: 14px; color: #6b7280; line-height: 1.5; margin-bottom: 15px; }
          .firm-info strong { color: #374151; }
          .title { font-size: 18px; color: #6b7280; margin-bottom: 20px; }
          h2 { color: #374151; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 30%; }
          td { padding: 8px; border: 1px solid #e5e7eb; color: #1f2937; }
          @media print { body { margin: 15px; } .header { margin-bottom: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="firm-name">Jay Maharashtra Security Services</div>
          <div class="firm-info">
            C.S.No 942/2 plot no 01, Miraj Kupwad road Dwaraka Nagar MIDC Miraj Dist Sangli MH 416410<br>
            Phone: +91 9028039821 | Email: securejms@yahoo.com
          </div>
          <div class="title">Company Details Report</div>
        </div>
        
        <h2>Company Information</h2>
        <table>
          <tr><th>Company Name</th><td>${selectedCompany.name || 'N/A'}</td></tr>
          <tr><th>Registration Date</th><td>${selectedCompany.registrationDate || 'N/A'}</td></tr>
          <tr><th>GST Number</th><td>${selectedCompany.gstNumber || 'N/A'}</td></tr>
          <tr><th>Agreement Rate (Monthly)</th><td>${selectedCompany.employeeSalary ? `₹${selectedCompany.employeeSalary}` : 'N/A'}</td></tr>
          <tr><th>Work Shift</th><td>${selectedCompany.shift || '8 Hours'}</td></tr>
          <tr><th>Address</th><td>${selectedCompany.address || 'N/A'}</td></tr>
        </table>
        
        <h2>Location Information</h2>
        <table>
          <tr><th>City</th><td>${selectedCompany.city || 'N/A'}</td></tr>
          <tr><th>State</th><td>${selectedCompany.state || 'N/A'}</td></tr>
          <tr><th>Pincode</th><td>${selectedCompany.pincode || 'N/A'}</td></tr>
        </table>
        
        ${(selectedCompany.contactPerson || selectedCompany.phone || selectedCompany.email) ? `
        <h2>Contact Information</h2>
        <table>
          ${selectedCompany.contactPerson ? `<tr><th>Contact Person</th><td>${selectedCompany.contactPerson}</td></tr>` : ''}
          ${selectedCompany.phone ? `<tr><th>Phone Number</th><td>${selectedCompany.phone}</td></tr>` : ''}
          ${selectedCompany.email ? `<tr><th>Email Address</th><td>${selectedCompany.email}</td></tr>` : ''}
        </table>
        ` : ''}
        
        <h2>Registration Info</h2>
        <table>
          <tr><th>Created Date</th><td>${selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleString() : 'N/A'}</td></tr>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Download company details as PDF
  const handleDownloadPDF = async () => {
    try {
      setNotification({
        show: true,
        message: 'Generating PDF...',
        type: 'info'
      });

      // Create a temporary div with the proper format
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        font-family: Arial, sans-serif;
        padding: 20px;
        background: white;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
      `;
      
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1f2937;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px;">Jay Maharashtra Security Services</div>
          <div style="font-size: 14px; color: #6b7280; line-height: 1.5; margin-bottom: 15px;">
            C.S.No 942/2 plot no 01, Miraj Kupwad road Dwaraka Nagar MIDC Miraj Dist Sangli MH 416410<br>
            Phone: +91 9028039821 | Email: securejms@yahoo.com
          </div>
          <div style="font-size: 18px; color: #6b7280; margin-bottom: 20px;">Company Details Report</div>
        </div>
        
        <h2 style="color: #374151; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Company Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 30%;">Company Name</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.name || 'N/A'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Registration Date</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.registrationDate || 'N/A'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">GST Number</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.gstNumber || 'N/A'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Agreement Rate (Monthly)</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.employeeSalary ? `₹${selectedCompany.employeeSalary}` : 'N/A'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Work Shift</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.shift || '8 Hours'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Address</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.address || 'N/A'}</td></tr>
        </table>
        
        <h2 style="color: #374151; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Location Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 30%;">City</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.city || 'N/A'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">State</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.state || 'N/A'}</td></tr>
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Pincode</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.pincode || 'N/A'}</td></tr>
        </table>
        
        ${(selectedCompany.contactPerson || selectedCompany.phone || selectedCompany.email) ? `
        <h2 style="color: #374151; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Contact Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${selectedCompany.contactPerson ? `<tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 30%;">Contact Person</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.contactPerson}</td></tr>` : ''}
          ${selectedCompany.phone ? `<tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Phone Number</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.phone}</td></tr>` : ''}
          ${selectedCompany.email ? `<tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Email Address</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.email}</td></tr>` : ''}
        </table>
        ` : ''}
        
        <h2 style="color: #374151; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Registration Info</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><th style="text-align: left; padding: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 30%;">Created Date</th><td style="padding: 8px; border: 1px solid #e5e7eb; color: #1f2937;">${selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleString() : 'N/A'}</td></tr>
        </table>
      `;

      // Temporarily add to body for html2canvas to capture
      document.body.appendChild(tempDiv);
      
      // Create canvas from the element
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight
      });

      // Remove temporary div
      document.body.removeChild(tempDiv);

      // Get canvas dimensions
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate PDF dimensions (A4 size in mm)
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Save the PDF
      const fileName = `company-details-${selectedCompany.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'company'}-${Date.now()}.pdf`;
      pdf.save(fileName);

      setNotification({
        show: true,
        message: 'PDF downloaded successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setNotification({
        show: true,
        message: 'Error generating PDF. Please try again.',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Company Management</h2>
                <p className="mt-1 text-sm text-gray-500">Manage all companies in the system</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setEditingCompany(null);
                    setIsModalOpen(true);
                    setShowDataTable(true); // Show data table when Add Company is clicked
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add Company
                </button>
              </div>
            </div>
          </div>

          {(showDataTable || companies.length > 0) && (
            <div className="px-6 py-4">
              <DataTable
                data={companies}
                columns={companyColumns}
                searchable={true}
                searchPlaceholder="Search companies..."
                pagination={true}
                itemsPerPage={10}
                emptyState={
                  <div className="text-center py-12">
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search or add a new company.
                    </p>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Company Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCancel} 
        title={`${editingCompany ? 'Edit' : 'Add New'} Company`}
      >
        <AddCompanyForm 
          onAdd={handleAddCompany} 
          onCancel={handleCancel} 
          initialData={editingCompany}
        />
      </Modal>

      {/* Company Details Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={handleCloseDetailModal} 
        title="Company Details"
      >
        {selectedCompany && (
          <div id="company-details-content" className="space-y-6">
            {/* 🔹 Company Basic Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.name || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Registration Date</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.registrationDate || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">GST Number</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.gstNumber || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Agreement Rate (Monthly)</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.employeeSalary ? `₹${selectedCompany.employeeSalary}` : 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Day-wise Salary</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedCompany.dayWiseSalary ? `₹${selectedCompany.dayWiseSalary}` : 
                     selectedCompany.employeeSalary ? `₹${calculateDayWiseSalary(parseFloat(selectedCompany.employeeSalary))}` : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Hourly Salary</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedCompany.hourlyWiseSalary ? `₹${selectedCompany.hourlyWiseSalary}` : 
                     selectedCompany.dayWiseSalary ? `₹${calculateHourlyWiseSalary(selectedCompany.dayWiseSalary, selectedCompany.shift)}` :
                     selectedCompany.employeeSalary ? `₹${calculateHourlyWiseSalary(calculateDayWiseSalary(parseFloat(selectedCompany.employeeSalary)), selectedCompany.shift)}` : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Work Shift</p>
                  <p className="text-base font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedCompany.shift || '8 Hours'}
                    </span>
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* 🔹 Location Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.city || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">State</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.state || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Pincode</p>
                  <p className="text-base font-medium text-gray-900">{selectedCompany.pincode || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* 🔹 Contact Information - Only show if contact data exists */}
            {(selectedCompany.contactPerson || selectedCompany.phone || selectedCompany.email) && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCompany.contactPerson && (
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="text-base font-medium text-gray-900">{selectedCompany.contactPerson}</p>
                    </div>
                  )}

                  {selectedCompany.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="text-base font-medium text-gray-900">{selectedCompany.phone}</p>
                    </div>
                  )}

                  {selectedCompany.email && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="text-base font-medium text-gray-900">{selectedCompany.email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🔹 Registration Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Created Date</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedCompany.createdAt
                      ? new Date(selectedCompany.createdAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* 🔹 Action Buttons */}
            <div className="flex justify-center space-x-4 pt-4 border-t">
              <button
                onClick={handlePrintCompany}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Print Details"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                title="Download PDF"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Company Details - ${selectedCompany?.name || ''}`);
                  const lines = [
                    'Jay Maharashtra Security Services - Company Details',
                    '--------------------------------------------------',
                    '',
                    `Company Name      : ${selectedCompany?.name || ''}`,
                    `Contact Person    : ${selectedCompany?.contactPerson || ''}`,
                    `Phone             : ${selectedCompany?.phone || ''}`,
                    `Email             : ${selectedCompany?.email || ''}`,
                    `Address           : ${selectedCompany?.address || ''}`,
                    `City              : ${selectedCompany?.city || ''}`,
                    `State             : ${selectedCompany?.state || ''}`,
                    `Pincode           : ${selectedCompany?.pincode || ''}`,
                    `GST Number        : ${selectedCompany?.gstNumber || ''}`,
                    `Agreement (Monthly): ${selectedCompany?.employeeSalary || ''}`,
                    '',
                    '---',
                    'This email was generated from the Jay Mahashtra Security Services.',
                  ];

                  const body = encodeURIComponent(lines.join('\n'));
                  // No TO address so user can choose recipient, but data is pre-filled
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
                className="inline-flex items-center px-4 py-2 border border-purple-300 rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                title="Send Email"
              >
                <span className="mr-2">✉</span>
                Send Email
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notification */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 z-50">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification({ ...notification, show: false })}
          />
        </div>
      )}
    </div>
  );
}


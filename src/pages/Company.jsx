import React, { useState, useEffect } from 'react';
import DataTable from '../components/Table/DataTable';
import StatCard from '../components/CardStats/StatCard';
import StatusBadge from '../components/widgets/StatusBadge';
import Modal from '../components/Modal/Modal';
import AddCompanyForm from '../components/Forms/AddCompanyForm';
import {
  UsersIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

const Company = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddCompany = async (newCompany) => {
    try {
      console.log("🏢 Adding new company with custom ID...");
      const addedCompany = await api.addCompany({
        ...newCompany,
        status: 'off_duty'
      });
      
      console.log("✅ Company added successfully:", addedCompany);
      console.log(`📄 Company ID: ${addedCompany.companyId}`);
      
      // Add to local state
      setCompanies([addedCompany, ...companies]);
      setIsModalOpen(false);
    } catch (error) {
      console.error("❌ Error adding company:", error);
      alert("Failed to add company. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companyData = await api.getCompanies();
        // Ensure all companies have a status field
        const companiesWithStatus = companyData.map(company => ({
          ...company,
          status: company.status || 'off_duty'
        }));
        setCompanies(companiesWithStatus);
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const companyColumns = [
    { 
      key: 'companyId', 
      label: 'Company ID',
      render: (companyId, company) => (
        <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {companyId || company.id}
        </span>
      )
    },
    { key: 'name', label: 'Company Name' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Contact' },
    { 
      key: 'status', 
      label: 'Status',
      render: (status) => <StatusBadge status={status} size="sm" />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, company) => (
        <div className="flex space-x-2">
          <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
            Edit
          </button>
          <button className="text-red-600 hover:text-red-800 text-sm font-medium">
            Remove
          </button>
        </div>
      )
    }
  ];

  const companyStats = {
    total: companies.length,
    onDuty: companies.filter(company => company.status === 'on_duty').length,
    offDuty: companies.filter(company => company.status === 'off_duty').length,
    onBreak: companies.filter(company => company.status === 'break').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Security Companies</h1>
          <p className="text-gray-600 mt-1">Manage your security companies and their assignments</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="mt-4 sm:mt-0 btn-primary flex items-center space-x-2">
          <UserPlusIcon className="h-5 w-5" />
          <span>Add New Company</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Companies"
          value={companyStats.total}
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          title="On Duty"
          value={companyStats.onDuty}
          icon={ShieldCheckIcon}
          color="green"
        />
        <StatCard
          title="Off Duty"
          value={companyStats.offDuty}
          icon={UsersIcon}
          color="gray"
        />
        <StatCard
          title="On Break"
          value={companyStats.onBreak}
          icon={ClockIcon}
          color="yellow"
        />
      </div>

      {/* Companies Table */}
      <DataTable
        data={companies}
        columns={companyColumns}
        title="Company Directory"
        searchable={true}
        sortable={true}
        pagination={true}
        itemsPerPage={10}
      />

      <Modal isOpen={isModalOpen} onClose={handleCancel} title="Add New Company">
        <AddCompanyForm onAdd={handleAddCompany} onCancel={handleCancel} />
      </Modal>
    </div>
  );
};

export default Company;

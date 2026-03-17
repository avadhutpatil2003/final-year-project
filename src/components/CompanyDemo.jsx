import React from 'react';
import { getCompanyOptions, getCompanyById } from '../data/companyData';

const CompanyDemo = () => {
  const companies = getCompanyOptions();
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Available Companies</h2>
      
      <div className="space-y-4">
        {companies.map((company) => {
          const companyData = getCompanyById(company.value);
          return (
            <div key={company.value} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-600">{companyData.name}</h3>
              <p className="text-gray-700 font-medium">{companyData.fullName}</p>
              <p className="text-sm text-gray-600 mt-2">{companyData.address}</p>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>📞 {companyData.phone}</span>
                <span>✉️ {companyData.email}</span>
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>GST: {companyData.gst}</span>
                <span>PAN: {companyData.pan}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">How to Use:</h4>
        <ol className="list-decimal list-inside text-sm text-green-700 space-y-1">
          <li>Go to <strong>Salary Billing</strong> page</li>
          <li>Select an employee from the dropdown</li>
          <li>Select a company from the <strong>"Select Company"</strong> dropdown</li>
          <li>Fill in the salary details</li>
          <li>Generate the salary slip - it will include the company header</li>
        </ol>
      </div>
    </div>
  );
};

export default CompanyDemo;

import React, { useState, useEffect } from "react";

const SalaryBillingDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState([]);
  
  useEffect(() => {
    const checks = [];
    
    // Check 1: React imports
    try {
      checks.push({ name: "React", status: "✅ OK" });
    } catch (e) {
      checks.push({ name: "React", status: "❌ " + e.message });
    }
    
    // Check 2: Firebase
    try {
      const { db } = require("../firebase");
      checks.push({ name: "Firebase", status: db ? "✅ OK" : "❌ Not initialized" });
    } catch (e) {
      checks.push({ name: "Firebase", status: "❌ " + e.message });
    }
    
    // Check 3: AdvanceContext
    try {
      const { useAdvance } = require("../contexts/AdvanceContext");
      checks.push({ name: "AdvanceContext", status: "✅ OK" });
    } catch (e) {
      checks.push({ name: "AdvanceContext", status: "❌ " + e.message });
    }
    
    // Check 4: Company Data
    try {
      const { getCompanyOptions } = require("../data/companyData");
      const options = getCompanyOptions();
      checks.push({ name: "Company Data", status: `✅ OK (${options.length} companies)` });
    } catch (e) {
      checks.push({ name: "Company Data", status: "❌ " + e.message });
    }
    
    // Check 5: Heroicons
    try {
      const icons = require("@heroicons/react/24/outline");
      checks.push({ name: "Heroicons", status: "✅ OK" });
    } catch (e) {
      checks.push({ name: "Heroicons", status: "❌ " + e.message });
    }
    
    // Check 6: date-fns
    try {
      const { format } = require("date-fns");
      checks.push({ name: "date-fns", status: "✅ OK" });
    } catch (e) {
      checks.push({ name: "date-fns", status: "❌ " + e.message });
    }
    
    // Check 7: jsPDF
    try {
      const jsPDF = require("jspdf");
      checks.push({ name: "jsPDF", status: "✅ OK" });
    } catch (e) {
      checks.push({ name: "jsPDF", status: "❌ " + e.message });
    }
    
    setDiagnostics(checks);
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">
        🔍 SalaryBilling Diagnostic Report
      </h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Dependency Checks:</h2>
        
        <div className="space-y-2">
          {diagnostics.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">{check.name}</span>
              <span className={check.status.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                {check.status}
              </span>
            </div>
          ))}
        </div>
        
        {diagnostics.length === 0 && (
          <p className="text-gray-500">Running diagnostics...</p>
        )}
      </div>
      
      <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800 font-semibold">
          📋 Check browser console (F12) for additional errors
        </p>
      </div>
    </div>
  );
};

export default SalaryBillingDiagnostic;

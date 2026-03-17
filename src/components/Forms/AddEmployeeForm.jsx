import React, { useState, useEffect } from "react";
import Input from "./Input";
import FileUpload from "./FileUpload";
import {
  UserIcon,
  CakeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const AddEmployeeForm = ({ onAdd, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    aadhar: "",
    address: "",
    phone: "",
    email: "",
    joiningDate: "",
    shift: "",
    salary: "", // Keep for backward compatibility
    salary8Hours: "", // New: 8 hours shift salary
    salary12Hours: "", // New: 12 hours shift salary
    photo: null,
    bankAccount: "",
    bankIFSC: "",
    bankName: "",
    bankAddress: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeAadhar: "",
    nomineeContact: "",
    // ESI Fields
    esiEligible: false,
    esiNumber: "",
    pfNumber: "",
    esiRegistrationDate: "",
    esiNomineeName: "",
    esiNomineeRelation: "",
    esiNomineeAadhar: "",
    esiNomineeContact: "",
    esiMedicalHistory: "",
    esiPreviousEmployer: "",
    esiPreviousEsiNumber: "",
  });

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      const formatDate = (dateValue) => {
        if (!dateValue) return "";
        if (dateValue.toDate) {
          return dateValue.toDate().toISOString().split("T")[0];
        }
        if (typeof dateValue === "string") {
          return dateValue.split("T")[0];
        }
        return dateValue;
      };

      setFormData({
        name: initialData.name || "",
        dob: formatDate(initialData.dob) || "",
        aadhar: initialData.aadhar || "",
        address: initialData.address || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        joiningDate: formatDate(initialData.joiningDate) || "",
        shift: initialData.shift || "",
        salary: initialData.salary || "",
        salary8Hours: initialData.salary8Hours || "",
        salary12Hours: initialData.salary12Hours || "",
        photo: initialData.photo || null,
        bankAccount: initialData.bankAccount || "",
        bankIFSC: initialData.bankIFSC || "",
        bankName: initialData.bankName || "",
        bankAddress: initialData.bankAddress || "",
        nomineeName: initialData.nomineeName || "",
        nomineeRelation: initialData.nomineeRelation || "",
        nomineeAadhar: initialData.nomineeAadhar || "",
        nomineeContact: initialData.nomineeContact || "",
        esiNumber: initialData.esiNumber || "",
        pfNumber: initialData.pfNumber || "",
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (file) => {
    setFormData((prev) => ({ ...prev, photo: file }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 🔹 Personal Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Personal Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Full Name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee's full name"
              required
              icon={UserIcon}
            />
          </div>
          <Input
            label="Date of Birth"
            id="dob"
            type="date"
            value={formData.dob}
            onChange={handleChange}
            required
            icon={CakeIcon}
          />
          <Input
            label="Aadhar No"
            id="aadhar"
            value={formData.aadhar}
            onChange={handleChange}
            placeholder="Enter 12-digit Aadhar number"
            required
            icon={IdentificationIcon}
          />
          <div className="md:col-span-2">
            <Input
              label="Address"
              id="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter full address"
              required
              icon={MapPinIcon}
            />
          </div>
        </div>
      </div>

      {/* 🔹 Nominee Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Nominee Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nominee Name"
            id="nomineeName"
            value={formData.nomineeName}
            onChange={handleChange}
            placeholder="Enter nominee's full name"
            required
            icon={UserIcon}
          />

          <div className="flex flex-col">
            <label
              htmlFor="nomineeRelation"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Relation
            </label>
            <select
              id="nomineeRelation"
              value={formData.nomineeRelation}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select Relation</option>
              <option value="Wife">Wife</option>
              <option value="Husband">Husband</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Son">Son</option>
              <option value="Daughter">Daughter</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
            </select>
          </div>

          <Input
            label="Nominee Aadhar No"
            id="nomineeAadhar"
            value={formData.nomineeAadhar}
            onChange={handleChange}
            placeholder="Enter 12-digit Aadhar number"
            required
            icon={IdentificationIcon}
          />
          <Input
            label="Nominee Contact No"
            id="nomineeContact"
            value={formData.nomineeContact}
            onChange={handleChange}
            placeholder="Enter 10-digit contact number"
            required
            icon={PhoneIcon}
          />
        </div>
      </div>

      {/* 🔹 Contact Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Phone Number"
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter 10-digit phone number"
            required
            icon={PhoneIcon}
          />
          <Input
            label="Email Address"
            id="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            required
            icon={EnvelopeIcon}
          />
        </div>
      </div>

      {/* 🔹 Employment Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Employment Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Date of Joining"
            id="joiningDate"
            type="date"
            value={formData.joiningDate}
            onChange={handleChange}
            required
            icon={CalendarDaysIcon}
          />
          <div className="flex flex-col">
            <label
              htmlFor="shift"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Work Shift
            </label>
            <select
              id="shift"
              value={formData.shift}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select Shift</option>
              <option value="8 Hours">8 Hours</option>
              <option value="12 Hours">12 Hours</option>
            </select>
          </div>

          {/* 8 Hours Shift Payment */}
          <Input
            label="8 Hours Shift Payment"
            id="salary8Hours"
            type="number"
            value={formData.salary8Hours}
            onChange={handleChange}
            placeholder="Enter 8 hours shift payment"
            disabled={formData.shift !== "8 Hours"}
            required={formData.shift === "8 Hours"}
            icon={BanknotesIcon}
            prefix="₹"
          />

          {/* 12 Hours Shift Payment */}
          <Input
            label="12 Hours Shift Payment"
            id="salary12Hours"
            type="number"
            value={formData.salary12Hours}
            onChange={handleChange}
            placeholder="Enter 12 hours shift payment"
            disabled={formData.shift !== "12 Hours"}
            required={formData.shift === "12 Hours"}
            icon={BanknotesIcon}
            prefix="₹"
          />
        </div>
      </div>

      {/* 🔹 Bank Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Bank Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Bank Account No"
            id="bankAccount"
            value={formData.bankAccount}
            onChange={handleChange}
            placeholder="Enter bank account number"
            required
            icon={BanknotesIcon}
          />
          <Input
            label="Bank IFSC Code"
            id="bankIFSC"
            value={formData.bankIFSC}
            onChange={handleChange}
            placeholder="Enter IFSC code"
            required
            icon={BuildingLibraryIcon}
          />
          <Input
            label="Bank Name"
            id="bankName"
            value={formData.bankName}
            onChange={handleChange}
            placeholder="Enter bank name"
            required
            icon={BuildingLibraryIcon}
          />
          <Input
            label="Bank Address"
            id="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            placeholder="Enter bank address"
            required
            icon={MapPinIcon}
          />
        </div>
      </div>


      {/* 🔹 ESI (Employee State Insurance) Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
          ESI (Employee State Insurance)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="ESI Number"
            id="esiNumber"
            value={formData.esiNumber}
            onChange={handleChange}
            placeholder="Enter Employee ESI Number"
            icon={DocumentTextIcon}
          />

          <Input
            label="PF Number"
            id="pfNumber"
            value={formData.pfNumber}
            onChange={handleChange}
            placeholder="Enter Employee PF Number"
            icon={DocumentTextIcon}
          />
        </div>
      </div>

      {/* 🔹 Submit Buttons */}
      <div className="flex justify-end space-x-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initialData ? "Update Employee" : "Add Employee"}
        </button>
      </div>
    </form>
  );
};

export default AddEmployeeForm;

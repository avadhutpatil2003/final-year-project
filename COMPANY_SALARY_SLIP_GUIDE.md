# Company-Based Salary Slip Generation Guide

## Overview
This feature allows you to generate salary slips with company-specific headers for **JMS Group** and **Jay Maharashtra Security**. The salary slip will display the selected company's name, address, phone, and email in the header.

## Features Implemented

### 1. Company Data Structure
- **File**: `src/data/companyData.js`
- **Companies Available**:
  - **JMS Group** (JMS Group Security Services)
  - **Jay Maharashtra Security** (Jay Maharashtra Security Services Pvt. Ltd.)

### 2. Company Selection in Salary Billing
- **Location**: Salary Billing page (`/salary-billing`)
- **Required Field**: Company selection dropdown
- **Auto-populate**: Company details appear when selected

### 3. Enhanced Salary Slip Generation
- **Company Header**: Shows company name, address, phone, email
- **Professional Format**: Company letterhead style
- **PDF Generation**: Includes company information in downloaded PDFs
- **Print Format**: Company details in printed salary slips

## How to Use

### Step-by-Step Process:

1. **Navigate to Salary Billing**
   - Go to the Salary Billing page
   - URL: `http://localhost:3000/salary-billing`

2. **Select Employee**
   - Choose an employee from the "Select Employee" dropdown
   - Employee details will auto-populate

3. **Select Company** ⭐ **NEW FEATURE**
   - Choose company from "Select Company" dropdown:
     - **JMS Group**
     - **Jay Maharashtra Security**
   - Company details will appear automatically

4. **Fill Salary Details**
   - Enter month and year
   - Salary details will be calculated automatically
   - Add any deductions if needed

5. **Generate Salary Slip**
   - Click "Generate Salary Slip"
   - The slip will show the selected company's header
   - Company name, address, phone, and email will appear

6. **Download/Print**
   - Use "Download PDF" for company-branded PDF
   - Use "Print" for company-branded printout

## Company Information Included

### JMS Group
- **Full Name**: JMS Group Security Services
- **Address**: 123 Business District, Mumbai, Maharashtra 400001
- **Phone**: +91 98765 43210
- **Email**: info@jmsgroup.com
- **GST**: 27ABCDE1234F1Z5
- **PAN**: ABCDE1234F

### Jay Maharashtra Security
- **Full Name**: Jay Maharashtra Security Services Pvt. Ltd.
- **Address**: 456 Security Plaza, Pune, Maharashtra 411001
- **Phone**: +91 87654 32109
- **Email**: contact@jaymaharashtra.com
- **GST**: 27FGHIJ5678K2L6
- **PAN**: FGHIJ5678K

## Technical Implementation

### Files Modified:
1. `src/data/companyData.js` - Company data structure
2. `src/pages/SalaryBilling.jsx` - Added company selection
3. `src/pages/SalaryReports.jsx` - Updated PDF generation
4. `public/assets/logos/` - Logo placeholder files

### Key Functions:
- `getCompanyOptions()` - Get dropdown options
- `getCompanyById()` - Get company details
- PDF generation with company headers
- Modal display with company information

## Validation
- Company selection is **required** field
- Form validation ensures company is selected
- Error handling for missing company data

## Backward Compatibility
- Existing salary reports without company data still work
- Fallback to "Salary Slip Format" if no company selected
- No breaking changes to existing functionality

## Testing
1. Generate salary slip with JMS Group selected
2. Generate salary slip with Jay Maharashtra Security selected
3. Verify company header appears in PDF
4. Verify company details in modal display
5. Test print functionality with company branding

## Troubleshooting

### If Company Header Not Showing:
1. Ensure company is selected in dropdown
2. Check that form validation passes
3. Verify company data is saved in salary report
4. Refresh page and try again

### If PDF Missing Company Info:
1. Regenerate the salary slip with company selected
2. Check browser console for errors
3. Ensure company data structure is correct

## Future Enhancements
- Add company logos to PDF headers
- Support for more companies
- Custom company branding options
- Company-specific salary templates

---

**Note**: This feature is now live and ready for use. All salary slips generated with a company selected will include the company's professional header information.

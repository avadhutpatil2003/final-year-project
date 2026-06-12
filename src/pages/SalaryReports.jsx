import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CurrencyDollarIcon, EyeIcon, XMarkIcon, PrinterIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import api from "../services/api";
import DataTable from "../components/Table/DataTable";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getCompanyById } from "../data/companyData";

// Helper function to safely get deduction amount
const getDeductionAmount = (deductions) => {
  if (!deductions) return 0;
  if (typeof deductions === 'number') return deductions;
  if (typeof deductions === 'object' && deductions.totalDeductions !== undefined) {
    return parseFloat(deductions.totalDeductions) || 0;
  }
  return 0;
};

async function getImageAsBase64(imagePath) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = this.width;
      canvas.height = this.height;
      ctx.drawImage(this, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = function () {
      console.error('Failed to load image:', imagePath);
      resolve(null);
    };
    img.src = imagePath;
  });
}

const SalaryReports = () => {
  const navigate = useNavigate();
  const [salaryReports, setSalaryReports] = useState([]);
  const [allSalaryReports, setAllSalaryReports] = useState([]); // Store all reports for View All functionality
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
  const [selectedEmployeeReports, setSelectedEmployeeReports] = useState([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentPopupData, setPaymentPopupData] = useState(null);
  const [employeesMap, setEmployeesMap] = useState({});

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        const map = {};
        snapshot.forEach(doc => {
          map[doc.id] = doc.data();
        });
        setEmployeesMap(map);
      } catch (error) {
        console.error('Error fetching employees for compliance info:', error);
      }
    };

    fetchEmployees();
  }, []);

  const getEmployeeComplianceNumbers = (report) => {
    const employeeDetails = employeesMap[report.employeeId] || {};
    const bankDetails = report.employeeBankDetails || {};

    const esiNumber = bankDetails.esiNumber || bankDetails.esiNo || employeeDetails.esiNumber || employeeDetails.esiNo || employeeDetails.esi || 'N/A';
    const pfNumber = bankDetails.pfNumber || bankDetails.pfNo || employeeDetails.pfNumber || employeeDetails.pfNo || employeeDetails.pf || 'N/A';

    return { esiNumber, pfNumber };
  };



  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getSalaryReports();

      if (!data || data.length === 0) {
        setSalaryReports([]);
        setAllSalaryReports([]);
        return;
      }

      // Add company information to each report (optimized)
      const reportsWithCompanyInfo = data.map(report => {
        // Prefer companyInfo already saved in report (from SalaryBilling)
        if (report.companyInfo) {
          return report;
        }

        // Fallback: if companyId present, derive companyInfo from it
        if (report.companyId) {
          const derivedCompanyInfo = getCompanyById(report.companyId);
          return {
            ...report,
            companyInfo: derivedCompanyInfo || null
          };
        }

        // Last fallback: keep report as-is (no company info)
        return report;
      });

      // Store all reports for View All functionality
      setAllSalaryReports(reportsWithCompanyInfo);

      // Remove duplicate employees - keep only the latest report for each employee (optimized)
      const uniqueEmployees = new Map();
      reportsWithCompanyInfo.forEach(report => {
        const employeeKey = report.employeeId || report.employeeName;
        if (employeeKey) {
          const existing = uniqueEmployees.get(employeeKey);
          if (!existing || new Date(report.generatedDate) > new Date(existing.generatedDate)) {
            uniqueEmployees.set(employeeKey, report);
          }
        }
      });

      // Convert back to array
      const uniqueReports = Array.from(uniqueEmployees.values());

      setSalaryReports(uniqueReports);
      console.log(`📊 Loaded ${uniqueReports.length} unique salary reports`);
    } catch (error) {
      console.error("Error fetching salary reports:", error);
      setNotification({
        show: true,
        message: "Failed to load salary reports. Please refresh the page.",
        type: "error"
      });

      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  // Function to get next allowed status
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending':
        return 'paid';
      case 'payment_hold':
        return 'paid';
      case 'paid':
        return null; // No change allowed for paid status
      case 'generated':
        return 'paid';
      default:
        return 'paid';
    }
  };

  // Function to update salary report status
  const updateSalaryStatus = async (reportId, newStatus = null) => {
    // If no status provided, cycle to next status
    if (!newStatus) {
      const currentReport = salaryReports.find(report => report.id === reportId) ||
        allSalaryReports.find(report => report.id === reportId);
      if (currentReport) {
        newStatus = getNextStatus(currentReport.status);

        // If status is already paid, show notification and return
        if (newStatus === null) {
          setNotification({
            show: true,
            message: "This salary is already marked as PAID. No further changes allowed.",
            type: "info"
          });

          // Hide notification after 3 seconds
          setTimeout(() => {
            setNotification({ show: false, message: "", type: "" });
          }, 3000);

          return;
        }
      } else {
        newStatus = 'paid';
      }
    }

    try {
      // Set updating status immediately for UI feedback
      setUpdatingStatus(reportId);

      // Get current report to check previous status BEFORE updating
      const currentReport = salaryReports.find(report => report.id === reportId) ||
        allSalaryReports.find(report => report.id === reportId);
      const previousStatus = currentReport?.status;

      console.log(`🔄 Status Update: ${previousStatus} → ${newStatus} for report ${reportId}`);

      // Prepare update data
      const updateData = {
        status: newStatus,
        paymentInfo: {
          paymentStatus: newStatus,
          paymentDate: newStatus === 'paid' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };

      // Update UI immediately for better UX (optimistic update)
      const updateReport = (report) =>
        report.id === reportId ? { ...report, ...updateData } : report;

      setSalaryReports(prevReports => prevReports.map(updateReport));
      setAllSalaryReports(prevReports => prevReports.map(updateReport));
      setSelectedEmployeeReports(prevReports => prevReports.map(updateReport));

      // Update Firebase in background
      const reportRef = doc(db, "salary_reports", reportId);
      await updateDoc(reportRef, updateData);

      // Show specific notification based on status change
      let notificationMessage = `Salary marked as ${newStatus.toUpperCase()} successfully!`;

      console.log(`📢 Checking notification: newStatus=${newStatus}, previousStatus=${previousStatus}`);

      if (newStatus === 'paid' && (previousStatus === 'pending' || previousStatus === 'payment_hold' || previousStatus === 'hold')) {
        // Show popup modal for payment updates
        const employeeName = currentReport?.employeeName || 'Employee';
        const netSalary = currentReport?.totalAmount || 0;
        const employeeShift = currentReport?.employeeShift || 'N/A';
        const employeeSalary = currentReport?.employeeSalary || 'N/A';

        setPaymentPopupData({
          employeeName,
          netSalary,
          previousStatus,
          newStatus,
          paymentDate: new Date().toLocaleDateString(),
          employeeShift,
          employeeSalary
        });
        setShowPaymentPopup(true);

        console.log(`📢 Payment popup triggered for ${previousStatus} → ${newStatus}`);
      } else {
        // Show regular notification for other updates
        setNotification({
          show: true,
          message: notificationMessage,
          type: "success"
        });

        // Auto-hide notification
        setTimeout(() => {
          setNotification({ show: false, message: "", type: "" });
        }, 3000);
      }

    } catch (error) {
      console.error("Error updating salary status:", error);

      // Revert optimistic update on error
      fetchReports();

      setNotification({
        show: true,
        message: "Failed to update status. Please try again.",
        type: "error"
      });

      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 3000);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleViewAllReports = (employee) => {
    // Filter ALL reports (including duplicates) for the selected employee
    const employeeReports = allSalaryReports.filter(report =>
      report.employeeId === employee.employeeId || report.employeeName === employee.employeeName
    );

    // Sort by date (newest first)
    employeeReports.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));

    setSelectedEmployeeReports(employeeReports);
    setSelectedEmployeeName(employee.employeeName);
    setIsViewAllModalOpen(true);

    console.log(`📊 Showing all reports for ${employee.employeeName}:`, employeeReports);
  };

  const closeViewAllModal = () => {
    setIsViewAllModalOpen(false);
    setSelectedEmployeeReports([]);
    setSelectedEmployeeName("");
  };



  const printSingleSalarySlip = (report) => {
    const { esiNumber, pfNumber } = getEmployeeComplianceNumbers(report);
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    // Generate HTML content for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${report.employeeName} - ${report.monthName} ${report.year}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 30px 40px; 
            color: #333;
          }
          .header { 
            width: 100%;
            margin-bottom: 30px;
          }
          .header-inner {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }
          .header-logo {
            height: 70px;
          }
          .header-text {
            text-align: center;
            flex: 1;
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px;
          }
          .slip-header { 
            color: black; 
            text-align: center; 
            padding: 4px 10px; 
            font-size: 18px; 
            font-weight: bold;
            margin: 4px 0 8px 0;
          }
          .generated-date {
            display: none;
          }
          .section-header { 
            padding: 8px; 
            font-weight: bold; 
            text-align: center;
            margin: 12px 0 8px 0;
            border-bottom: 2px solid #333;
          }
          .employee-info { 
            margin-bottom: 30px;
            border: 2px solid #333;
            padding: 20px;
            border-radius: 5px;
            min-height: 170px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .info-row { 
            margin: 8px 0;
            font-size: 12px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          .table th, .table td { 
            border: 1px solid #333; 
            padding: 8px; 
            text-align: left;
            font-size: 11px;
          }
          .table th { 
            font-weight: bold; 
            text-align: center;
          }
          .total-row { 
            font-weight: bold;
          }
          .net-pay { 
            padding: 10px; 
            font-weight: bold; 
            margin: 20px 5px ;
          }
          .signature-section { 
            margin-top: 40px;
          }
          .signature-table { 
            width: 100%; 
            border-collapse: collapse;
          }
          .signature-table td { 
            border: 1px solid #333; 
            padding: 20px; 
            height: 60px; 
            width: 50%;
          }
          .signature-header { 
            font-weight: bold; 
            padding: 8px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${report.companyInfo ? `
        <div class="header">
          <div class="header-inner">
            ${report.companyInfo.logo ? `<img src="${report.companyInfo.logo}" alt="Company Logo" class="header-logo">` : ''}
            <div class="header-text">
              <div class="title" style="margin: 0;">${report.companyInfo.fullName}</div>
              <div style="font-size: 12px; margin-top: 5px;">${report.companyInfo.address}</div>
              <div style="font-size: 12px; margin-top: 3px;">Phone: ${report.companyInfo.phone} | Email: ${report.companyInfo.email}</div>
            </div>
          </div>
        </div>
        ` : `
        <div class="header" style="text-align: center;">
        </div>
        `}
        
        <div class="section-header">Employee Information</div>
        <div class="employee-info">
          <div class="info-row"><strong>Employee Name:</strong> ${report.employeeName || 'N/A'}</div>
          <div class="info-row"><strong>Month:</strong> ${report.monthName} ${report.year}</div>
          <div class="info-row"><strong>Payment Date:</strong> ${report.status === 'paid' && report.paymentInfo?.paymentDate ? new Date(report.paymentInfo.paymentDate).toLocaleDateString() : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet')}</div>
          <div class="info-row"><strong>ESI No:</strong> ${esiNumber}</div>
          <div class="info-row"><strong>PF No:</strong> ${pfNumber}</div>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>Earnings</th>
              <th>Amount</th>
              <th>Deductions</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic</td>
              <td>₹${report.basicSalary || 0}</td>
              <td>Provident Fund</td>
              <td>₹0</td>
            </tr>
            <tr>
              <td>HRA</td>
              <td>₹0</td>
              <td>ESI</td>
              <td>₹0</td>
            </tr>
            <tr>
              <td>Special Allowance</td>
              <td>₹${report.allowances || 0}</td>
              <td>Professional Tax</td>
              <td>₹0</td>
            </tr>
            <tr>
              <td>Gross Salary</td>
              <td>₹${(parseFloat(report.basicSalary || 0) + parseFloat(report.allowances || 0)).toFixed(2)}</td>
              <td>Salary Advance</td>
              <td>₹0</td>
            </tr>
            <tr>
              <td>Other Earnings</td>
              <td>₹0</td>
              <td>TDS</td>
              <td>₹0</td>
            </tr>
            <tr>
              <td>Incentives</td>
              <td>₹0</td>
              <td>Other Deduction</td>
              <td>₹${report.deductions || 0}</td>
            </tr>
            <tr>
              <td>Bonus</td>
              <td>₹0</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Over Time Pay</td>
              <td>₹0</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Earnings</strong></td>
              <td><strong>₹${(parseFloat(report.basicSalary || 0) + parseFloat(report.allowances || 0)).toFixed(2)}</strong></td>
              <td><strong>Total Deductions</strong></td>
              <td><strong>₹${(parseFloat(report.deductions?.totalDeductions) || 0).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="net-pay">
          <strong>Net Pay: ₹${parseFloat(report.totalAmount || 0).toFixed(2)} | In Words: ${convertNumberToWords(parseFloat(report.totalAmount || 0))} Rupees Only</strong>
        </div>
        
        <div class="signature-section">
          <table class="signature-table">
            <tr>
              <td style="text-align: left;">
                <strong>Prepared By:</strong> ${report.preparedBy || ''}
              </td>
              <td style="text-align: left;">
                <strong>Received By:</strong> ${report.receivedBy || report.employeeName || ''}
              </td>
            </tr>
          </table>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Print</button>
          <button onclick="window.close()" style="background-color: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-trigger print dialog after content loads
    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const viewSalarySlip = (report) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  const drawSignatureSection = (doc, startY, report) => {
    const cellHeight = 40;
    const columnWidth = 90;
    const leftX = 15;
    const rightX = leftX + columnWidth;

    doc.setDrawColor(0, 0, 0);
    doc.rect(leftX, startY, columnWidth, cellHeight);
    doc.rect(rightX, startY, columnWidth, cellHeight);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Prepared By:", leftX + 5, startY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(report.preparedBy || 'SANIYA MUJAWAR', leftX + 5, startY + 24);

    doc.setFont("helvetica", "bold");
    doc.text("Received By:", rightX + 5, startY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(report.receivedBy || report.employeeName || 'TANAJI YAMGAR', rightX + 5, startY + 24);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Signature & Stamp", leftX + (columnWidth / 2), startY + 36, null, null, "center");
    doc.text("Employee Signature", rightX + (columnWidth / 2), startY + 36, null, null, "center");
    doc.setTextColor(0);

    return startY + cellHeight + 10;
  };

  const drawEmployeeInfoSection = (doc, startY, report, complianceInfo) => {
    const boxX = 15;
    const boxWidth = 180;
    const boxHeight = 75;
    const leftLabelX = 20;
    const leftValueX = 70;
    const rightLabelX = 125;
    const rightValueX = 165;
    const rowSpacing = 14;

    const paymentDate = report.status === 'paid' && report.paymentInfo?.paymentDate
      ? new Date(report.paymentInfo.paymentDate).toLocaleDateString()
      : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet');
    const { esiNumber, pfNumber } = complianceInfo || getEmployeeComplianceNumbers(report);

    const rows = [
      {
        leftLabel: 'Employee Name :',
        leftValue: report.employeeName || 'N/A',
        rightLabel: 'ESI No :',
        rightValue: esiNumber
      },
      {
        leftLabel: 'Month :',
        leftValue: `${report.monthName} ${report.year}`,
        rightLabel: 'PF No :',
        rightValue: pfNumber
      },
      {
        leftLabel: 'Payment Date :',
        leftValue: paymentDate,
        rightLabel: '',
        rightValue: ''
      }
    ];

    doc.rect(boxX, startY, boxWidth, boxHeight);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', boxX + boxWidth / 2, startY + 8, null, null, 'center');
    doc.line(boxX + 45, startY + 10, boxX + boxWidth - 45, startY + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    rows.forEach((row, index) => {
      const y = startY + 22 + index * rowSpacing;
      doc.text(row.leftLabel, leftLabelX, y);
      doc.text(row.leftValue, leftValueX, y);
      if (row.rightLabel) {
        doc.text(row.rightLabel, rightLabelX, y);
        doc.text(row.rightValue, rightValueX, y);
      }
      doc.line(boxX + 5, y + 2, boxX + boxWidth - 5, y + 2);
    });

    return startY + boxHeight + 5;
  };


  const generatePDF = async (report) => {
    const doc = new jsPDF();

    // Get company information
    const companyInfo = report.companyInfo;

    // Company Header
    if (companyInfo) {
      // Logo on left side
      if (companyInfo.logo) {
        try {
          // Load and convert logo to base64
          const logoBase64 = await getImageAsBase64(companyInfo.logo);
          if (logoBase64) {
            // Add actual logo image
            doc.addImage(logoBase64, 'PNG', 20, 5, 30, 15);
          } else {
            // Fallback if logo fails to load
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("[Company Logo]", 35, 15, null, null, "center");
          }
        } catch (error) {
          console.error('Error loading logo:', error);
          // Fallback if logo fails to load
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("[Company Logo]", 35, 15, null, null, "center");
        }

        // Company info positioned to the right of logo
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(companyInfo.fullName, 60, 12, null, null, "left");

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(companyInfo.address, 60, 19, null, null, "left");
        doc.text(`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`, 60, 25, null, null, "left");
      } else {
        // Center layout when no logo
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(companyInfo.fullName, 105, 15, null, null, "center");

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(companyInfo.address, 105, 22, null, null, "center");
        doc.text(`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`, 105, 28, null, null, "center");
      }
    } else {
      // Fallback title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Salary Slip Format", 105, 20, null, null, "center");
    }

    let yPos = 40;

    // Draw box around employee information section (ends at PF No)
    doc.rect(15, yPos, 180, 60);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Employee Information", 105, yPos + 8, null, null, "center");

    // Draw underline for section header
    doc.line(60, yPos + 10, 150, yPos + 10);

    // Employee Details
    yPos += 18;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Employee Name with underline
    doc.text(`Employee Name :`, 20, yPos);
    doc.text(`${report.employeeName || 'N/A'}`, 70, yPos);
    doc.line(70, yPos + 1, 190, yPos + 1);

    // Month with underline
    doc.text(`Month :`, 20, yPos + 8);
    doc.text(`${report.monthName} ${report.year}`, 70, yPos + 8);
    doc.line(70, yPos + 9, 190, yPos + 9);

    // Payment Date with underline
    doc.text(`Payment Date :`, 20, yPos + 16);
    const paymentDate = report.status === 'paid' && report.paymentInfo?.paymentDate
      ? new Date(report.paymentInfo.paymentDate).toLocaleDateString()
      : (report.status === 'paid' ? new Date().toLocaleDateString() : 'Not Paid Yet');
    doc.text(paymentDate, 70, yPos + 16);
    doc.line(70, yPos + 17, 190, yPos + 17);

    // ESI No with underline
    doc.text(`ESI No :`, 20, yPos + 24);
    const esiNumber = report.employeeBankDetails?.esiNumber || report.employeeBankDetails?.esiNo || 'N/A';
    doc.text(esiNumber, 70, yPos + 24);
    doc.line(70, yPos + 25, 190, yPos + 25);

    // PF No with underline
    doc.text(`PF No :`, 20, yPos + 32);
    const pfNumber = report.employeeBankDetails?.pfNumber || report.employeeBankDetails?.pfNo || 'N/A';
    doc.text(pfNumber, 70, yPos + 32);
    doc.line(70, yPos + 33, 190, yPos + 33);

    // Move to position after employee info box
    yPos = 40 + 60 + 10; // Start position + box height + gap

    const tableStartY = yPos;

    // Manual Table Creation (Earnings and Deductions)

    // Table Header

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Earnings", 37.5, yPos + 5, null, null, "center");
    doc.text("Amount", 82.5, yPos + 5, null, null, "center");
    doc.text("Deductions", 127.5, yPos + 5, null, null, "center");
    doc.text("Amount", 172.5, yPos + 5, null, null, "center");

    // Table Rows
    const tableData = [
      ['Basic', `${report.basicSalary || 0}`, 'Provident Fund', '0'],
      ['HRA', '0', 'ESI', '0'],
      ['Special Allowance', `${report.allowances || 0}`, 'Professional Tax', '0'],
      ['Gross Salary', `${(parseFloat(report.basicSalary || 0) + parseFloat(report.allowances || 0)).toFixed(2)}`, 'Salary Advance', '0'],
      ['Other Earnings', '0', 'TDS', '0'],
      ['Incentives', '0', 'Other Deduction', `${getDeductionAmount(report.deductions).toFixed(2)}`],
      ['Bonus', '0', '', ''],
      ['Over Time Pay', '0', '', ''],
      ['Total Earnings', `${(parseFloat(report.basicSalary || 0) + parseFloat(report.allowances || 0)).toFixed(2)}`, 'Total Deductions', `${getDeductionAmount(report.deductions).toFixed(2)}`]
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    tableData.forEach((row, index) => {
      yPos += 8;

      // Draw cell borders
      doc.rect(15, yPos, 45, 8);
      doc.rect(60, yPos, 45, 8);
      doc.rect(105, yPos, 45, 8);
      doc.rect(150, yPos, 45, 8);

      // Add text
      if (index === tableData.length - 1) {
        doc.setFont("helvetica", "bold");
      }

      doc.text(row[0], 17, yPos + 5);
      doc.text(row[1], 62, yPos + 5);
      doc.text(row[2], 107, yPos + 5);
      doc.text(row[3], 152, yPos + 5);

      if (index === tableData.length - 1) {
        doc.setFont("helvetica", "normal");
      }
    });

    // Draw outer box around the entire table
    const tableHeight = (tableData.length + 1) * 8; // +1 for header
    doc.rect(15, tableStartY, 180, tableHeight);

    // Net Pay Section
    yPos += 15;
    const netPay = parseFloat(report.totalAmount || 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const amountText = `Net Pay: ${netPay.toFixed(2)}`;
    const wordsText = `In Words: ${convertNumberToWords(netPay)} Rupees Only`;
    const wordsLines = doc.splitTextToSize(wordsText, 90);

    // Draw container box
    doc.rect(15, yPos, 180, 14 + (wordsLines.length - 1) * 5);
    doc.text(amountText, 20, yPos + 8);
    doc.text(wordsLines, 110, yPos + 8);

    yPos += 20 + (wordsLines.length - 1) * 5;
    drawSignatureSection(doc, yPos, report);

    doc.save(`${report.employeeName}_SalarySlip.pdf`);
  };

  // Helper function to convert numbers to words
  const convertNumberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertNumberToWords(num % 100) : '');
    if (num < 100000) return convertNumberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertNumberToWords(num % 1000) : '');

    return 'Amount too large';
  };

  const reportColumns = [
    {
      key: 'employeeName',
      label: 'Employee Name',
      render: (employeeName, item) => (
        <div>
          <div className="font-medium text-gray-900">{employeeName}</div>
          <div className="text-sm text-gray-500">ID: {item.employeeId}</div>
        </div>
      )
    },
    {
      key: 'monthName',
      label: 'Month',
      render: (monthName, item) => (
        <div className="text-sm">
          <div className="font-medium">{monthName} {item.year}</div>
          <div className="text-gray-500">Generated: {new Date(item.generatedDate).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      key: 'totalAmount',
      label: 'Net Salary',
      render: (totalAmount) => (
        <span className="font-bold text-green-600">₹{parseFloat(totalAmount || 0).toFixed(2)}</span>
      )
    },
    // {
    //   key: 'status',
    //   label: 'Status',
    //   render: (status) => (
    //     <div className="flex justify-center">
    //       {/* Current Status Display Only */}
    //       <span className={`px-3 py-2 text-sm font-medium rounded-full ${
    //         status === 'paid' ? 'bg-green-100 text-green-800' :
    //         status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    //         status === 'payment_hold' ? 'bg-red-100 text-red-800' :
    //         status === 'generated' ? 'bg-blue-100 text-blue-800' :
    //         'bg-gray-100 text-gray-800'
    //       }`}>
    //         {status === 'paid' ? '✓ Paid' :
    //          status === 'pending' ? '⏳ Pending' :
    //          status === 'payment_hold' ? '⏸ Hold' :
    //          status === 'generated' ? 'Generated' :
    //          status || 'Generated'}
    //       </span>
    //     </div>
    //   )
    // },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewAllReports(item)}
            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm flex items-center space-x-1"
            title="View All Monthly Reports"
          >
            <EyeIcon className="h-4 w-4" />
            <span>View All</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Reports</h1>
          <p className="text-gray-600 mt-1">View and download all generated salary reports</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">

          <button
            onClick={() => navigate("/salary-billing")}
            className="btn-primary flex items-center space-x-2"
          >
            <CurrencyDollarIcon className="h-5 w-5" />
            <span>Generate New Slip</span>
          </button>
        </div>
      </div>

      {notification.show && (
        <div
          className={`p-4 rounded-md ${notification.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : notification.type === "info"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {notification.message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading salary reports...</span>
        </div>
      ) : (
        <DataTable
          data={salaryReports}
          columns={reportColumns}
          title={`Salary Reports (${salaryReports.length})`}
          searchable={true}
          sortable={true}
          pagination={true}
          itemsPerPage={10}
        />
      )}

      {/* View All Reports Modal */}
      {isViewAllModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">All Salary Reports</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Employee: <span className="font-medium">{selectedEmployeeName}</span>
                  ({selectedEmployeeReports.length} reports found)
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Print All Button */}
                {/* <button
                  onClick={printAllSalarySlips}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  title="Print All Salary Slips"
                >
                  <PrinterIcon className="h-5 w-5" />
                  <span>Print All</span>
                </button> */}

                {/* Close Button */}
                <button
                  onClick={closeViewAllModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {selectedEmployeeReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedEmployeeReports.map((report, index) => (
                    <div key={report.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {report.monthName} {report.year}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${report.status === 'paid' ? 'bg-green-100 text-green-800' :
                          report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            report.status === 'payment_hold' ? 'bg-red-100 text-red-800' :
                              report.status === 'generated' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {report.status === 'paid' ? '✓ Paid' :
                            report.status === 'pending' ? '⏳ Pending' :
                              report.status === 'payment_hold' ? '⏸ Hold' :
                                report.status === 'generated' ? 'Generated' :
                                  report.status || 'Generated'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Basic Salary:</span>
                          <span className="font-medium">₹{parseFloat(report.basicSalary || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Allowances:</span>
                          <span className="font-medium">₹{parseFloat(report.allowances || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Deductions:</span>
                          <span className="font-medium text-red-600">-₹{getDeductionAmount(report.deductions).toFixed(2)}</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold">
                          <span className="text-gray-900">Net Salary:</span>
                          <span className="text-green-600">₹{parseFloat(report.totalAmount || 0).toFixed(2)}</span>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          Generated: {new Date(report.generatedDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200">
                        {/* Status cycling button - Only show if not paid */}
                        {(() => {
                          const nextStatus = getNextStatus(report.status);

                          // If already paid, show message instead of button
                          if (!nextStatus) {
                            return (
                              <div className="mb-3">
                                <div className="w-full bg-gray-100 text-gray-600 px-3 py-2 rounded-md text-sm font-medium text-center border border-gray-300">
                                  ✓ Already Paid - No Changes Allowed
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="mb-3">
                              <button
                                onClick={() => updateSalaryStatus(report.id)}
                                disabled={updatingStatus === report.id}
                                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Mark as Paid"
                              >
                                {updatingStatus === report.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <span>✓</span>
                                )}
                                <span>{updatingStatus === report.id ? 'Updating...' : 'Mark as Paid'}</span>
                              </button>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => viewSalarySlip(report)}
                            className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm font-medium flex items-center justify-center space-x-1"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => printSingleSalarySlip(report)}
                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center space-x-1"
                          >
                            <PrinterIcon className="h-4 w-4" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={async () => await generatePDF(report)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <CurrencyDollarIcon className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
                  <p className="text-gray-600">No salary reports found for this employee.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeViewAllModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View Modal */}
      {isViewModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Salary Report - {selectedReport.employeeName}
                </h3>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Salary Slip Content */}
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                {/* Header Section */}
                <div className="bg-blue-600 text-white p-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold">
                      {selectedReport.companyInfo?.name || 'Company Name'}
                    </h2>
                    <p className="text-sm opacity-90">
                      {selectedReport.companyInfo?.address || 'Company Address'}
                    </p>
                    <p className="text-sm opacity-90">
                      Phone: {selectedReport.companyInfo?.phone || 'N/A'} |
                      Email: {selectedReport.companyInfo?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Employee & Period Info */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">Employee Information</h3>
                      <p><strong>Name:</strong> {selectedReport.employeeName}</p>
                      <p><strong>Employee ID:</strong> {selectedReport.employeeId}</p>
                      <p><strong>Designation:</strong> {selectedReport.designation || 'Security Guard'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Pay Period</h3>
                      <p><strong>Month:</strong> {selectedReport.monthName} {selectedReport.year}</p>
                      <p><strong>Generated:</strong> {new Date(selectedReport.generatedDate).toLocaleDateString()}</p>
                      <p><strong>Status:</strong>
                        <span className={`ml-1 px-2 py-1 rounded text-xs ${selectedReport.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {selectedReport.status || 'pending'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Earnings & Deductions Table */}
                <div className="p-4">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Earnings</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Deductions</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Basic Salary</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.basicSalary || 0).toFixed(2)}</td>
                        <td className="border border-gray-300 px-4 py-2">Advance Deduction</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.advanceDeduction || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Bonus</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.bonus || 0).toFixed(2)}</td>
                        <td className="border border-gray-300 px-4 py-2">PF</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.pf || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Incentives</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.incentives || 0).toFixed(2)}</td>
                        <td className="border border-gray-300 px-4 py-2">EPFO</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.epfo || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Allowances</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.allowances || 0).toFixed(2)}</td>
                        <td className="border border-gray-300 px-4 py-2">ESIC</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.esic || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2 text-right"></td>
                        <td className="border border-gray-300 px-4 py-2">Uniform</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.uniform || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2 text-right"></td>
                        <td className="border border-gray-300 px-4 py-2">Shoes</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.shoes || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2 text-right"></td>
                        <td className="border border-gray-300 px-4 py-2">Other Deductions</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(selectedReport.other || 0).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-blue-100 font-semibold">
                        <td className="border border-gray-300 px-4 py-3">Total Earnings</td>
                        <td className="border border-gray-300 px-4 py-3 text-right">
                          ₹{(parseFloat(selectedReport.basicSalary || 0) + parseFloat(selectedReport.bonus || 0) + parseFloat(selectedReport.incentives || 0) + parseFloat(selectedReport.allowances || 0)).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-3">Total Deductions</td>
                        <td className="border border-gray-300 px-4 py-3 text-right">
                          ₹{(parseFloat(selectedReport.advanceDeduction || 0) + parseFloat(selectedReport.pf || 0) + parseFloat(selectedReport.epfo || 0) + parseFloat(selectedReport.esic || 0) + parseFloat(selectedReport.uniform || 0) + parseFloat(selectedReport.shoes || 0) + parseFloat(selectedReport.other || 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay Section */}
                <div className="bg-green-100 px-6 py-4 border-t border-gray-300">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800">
                      Net Pay: ₹{parseFloat(selectedReport.totalAmount || 0).toFixed(2)}
                    </h3>
                  </div>
                </div>


                {/* Deduction Details Section */}
                {selectedReport.deductions && selectedReport.deductions.deductionDetails && (
                  <div className="p-4 bg-gray-50 border-t">
                    <h4 className="font-bold text-gray-900 mb-3">Deduction Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedReport.deductions.deductionDetails.map((deduction, index) => (
                        <div key={index} className="flex justify-between py-1">
                          <span className="text-gray-700">{deduction.type}:</span>
                          <span className="font-semibold text-red-600">₹{deduction.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                {selectedReport.paymentInfo && (
                  <div className="p-4 bg-blue-50 border-t">
                    <h4 className="font-bold text-blue-900 mb-3">Payment Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Payment Method:</strong> {selectedReport.paymentInfo.paymentMethod || selectedReport.paymentMethod || 'N/A'}</p>
                        <p><strong>Payment Status:</strong> {selectedReport.paymentInfo.paymentStatus || selectedReport.status || 'N/A'}</p>
                      </div>
                      <div>
                        <p><strong>Payment Date:</strong> {selectedReport.paymentInfo.paymentDate || selectedReport.paymentDate || 'N/A'}</p>
                        <p><strong>Net Amount:</strong> ₹{parseFloat(selectedReport.paymentInfo?.netAmount || selectedReport.totalAmount || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => printSingleSalarySlip(selectedReport)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium flex items-center space-x-1"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={async () => await generatePDF(selectedReport)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Popup */}
      {showPaymentPopup && paymentPopupData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Success Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
              Payment Status Updated!
            </h3>

            {/* Employee Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Employee:</span>
                  <span className="font-medium text-gray-900">{paymentPopupData.employeeName}</span>
                </div>
                {paymentPopupData.employeeShift && paymentPopupData.employeeShift !== 'N/A' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shift:</span>
                    <span className="font-medium text-gray-900">{paymentPopupData.employeeShift}</span>
                  </div>
                )}
                {paymentPopupData.employeeSalary && paymentPopupData.employeeSalary !== 'N/A' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salary Rate:</span>
                    <span className="font-medium text-gray-900">₹{paymentPopupData.employeeSalary}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Salary:</span>
                  <span className="font-bold text-green-600">₹{parseFloat(paymentPopupData.netSalary || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-gray-900">
                    {paymentPopupData.previousStatus === 'hold' ? 'Hold' :
                      paymentPopupData.previousStatus === 'pending' ? 'Pending' :
                        paymentPopupData.previousStatus} → Paid
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date:</span>
                  <span className="font-medium text-gray-900">{paymentPopupData.paymentDate}</span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-center font-medium">
                ✅ The payment will be processed and paid to the employee.
              </p>
            </div>

            {/* Close Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowPaymentPopup(false);
                  setPaymentPopupData(null);
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium"
              >
                OK, Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryReports;

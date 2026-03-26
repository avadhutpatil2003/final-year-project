// 📌 Import Logos from src folder (space removed, names corrected)
import jmsLogo from "../assets/logos/Logo.jpeg";


export const companyData = {
  "jms-group": {
    id: "jms-group",
    name: "JMS Group",
    fullName: "AP Group ",
    address:
      "Islampur ",
    phone: "+91 9028039821",
    email: "securejms@yahoo.com",
    logo: jmsLogo,
    website: "www.jmsgroup.com",
    gst: "27ABCDE1234F1Z5",
    pan: "ABCDE1234F",
  },

  "jay-maharashtra-security": {
    id: "jay-maharashtra-security",
    name: "Jay Maharashtra Security",
    fullName: "AP Security Services ",
    address:
      "Islampur",
    phone: "+91 9028039821",
    email: "securejms@yahoo.com",
    logo: jmsLogo,
    website: "www.jaymaharashtra.com",
    gst: "27FGHIJ5678K2L6",
    pan: "FGHIJ5678K",
  },
};

// Helper function to get company by ID
export const getCompanyById = (companyId) => {
  return companyData[companyId] || null;
};

// Helper function to get all companies as array
export const getAllCompanies = () => {
  return Object.values(companyData);
};

// Helper function to get company options for dropdown
export const getCompanyOptions = () => {
  return Object.values(companyData).map((company) => ({
    value: company.id,
    label: company.name,
    fullData: company,
  }));
};

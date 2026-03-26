import { db, storage } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const api = {
  // 📊 Dashboard Stats (from Firestore)
  getDashboardStats: async () => {
    try {
      const [companiesSnap, employeesSnap, salarySnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, "companies")),
        getDocs(collection(db, "employees")),
        getDocs(collection(db, "salaries")),
        getDocs(collection(db, "attendance")),
      ]);

      const totalCompanies = companiesSnap.size;
      const totalEmployees = employeesSnap.size;
      const totalSalaries = salarySnap.size;
      const totalAttendance = attendanceSnap.size;

      return {
        totalCompanies,
        totalEmployees,
        totalSalaries,
        totalAttendance,
        attendanceRate: totalAttendance > 0 ? 95.2 : 0,
        stockAlerts: 0,
        monthlyHours: 0,
      };
    } catch (e) {
      console.error("Error getting dashboard stats:", e);
      return {
        totalCompanies: 0,
        totalEmployees: 0,
        totalSalaries: 0,
        totalAttendance: 0,
        attendanceRate: 0,
        stockAlerts: 0,
        monthlyHours: 0,
      };
    }
  },

  // 🏢 Company Management
  addCompany: async (companyData) => {
    try {
      // Generate a unique ID using timestamp and random number to avoid conflicts
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const nextCompanyId = `comp${timestamp}${random}`;
      
      console.log(`📝 Adding company: ${companyData.name || 'Unknown'} with ID: ${nextCompanyId}`);
      
      // Use setDoc with custom document ID instead of addDoc
      const docRef = doc(db, "companies", nextCompanyId);
      await setDoc(docRef, {
        ...companyData,
        companyId: nextCompanyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Company saved successfully: ${nextCompanyId}`);
      
      return { id: nextCompanyId, companyId: nextCompanyId, ...companyData };
    } catch (e) {
      console.error("❌ Error adding company: ", e);
      throw e;
    }
  },

  getCompanies: async () => {
    const querySnapshot = await getDocs(collection(db, "companies"));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  updateCompany: async (id, companyData) => {
    try {
      console.log(`🔄 Updating company: ${id}`);
      
      const refDoc = doc(db, "companies", id);
      await updateDoc(refDoc, {
        ...companyData,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Company updated: ${id}`);
      
      return { id, ...companyData };
    } catch (e) {
      console.error("❌ Error updating company: ", e);
      throw e;
    }
  },

  deleteCompany: async (id) => {
    try {
      console.log(`🗑️ Deleting company: ${id}`);
      
      await deleteDoc(doc(db, "companies", id));
      
      console.log(`✅ Company deleted: ${id}`);
      
      return true;
    } catch (e) {
      console.error("❌ Error deleting company: ", e);
      throw e;
    }
  },

  // 👷 Employees
  getEmployees: async () => {
    const querySnapshot = await getDocs(collection(db, "employees"));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  addEmployee: async (employeeData) => {
    try {
      // Check if employee with same name already exists
      const employeesSnapshot = await getDocs(collection(db, "employees"));
      const existingEmployee = employeesSnapshot.docs.find(doc => 
        doc.data().name.toLowerCase().trim() === employeeData.name.toLowerCase().trim()
      );
      
      if (existingEmployee) {
        throw new Error(`Employee with name "${employeeData.name}" already exists!`);
      }
      
      // Get current employees and find the highest SEQUENTIAL numeric ID only
      const employeeDocs = employeesSnapshot.docs;
      let maxId = 0;
      
      employeeDocs.forEach(doc => {
        const employeeId = doc.data().employeeId || '';
        // Only match sequential IDs (emp1, emp2, emp3), ignore timestamp IDs
        const match = employeeId.match(/^emp(\d+)$/);
        if (match) {
          const idNum = parseInt(match[1]);
          // Only consider reasonable sequential numbers (less than 10000)
          if (idNum < 10000 && idNum > maxId) {
            maxId = idNum;
          }
        }
      });
      
      // Generate next sequential ID (always start from 1 if no sequential employees found)
      const nextEmployeeId = `emp${maxId + 1}`;
      
      console.log(`👤 Adding employee: ${employeeData.name} with ID: ${nextEmployeeId}`);
      console.log(`🔢 Employee ID Generation: Highest sequential found: emp${maxId}, Next: ${nextEmployeeId}`);
      console.log(`📋 Total employees in database: ${employeeDocs.length}`);
      
      // Use setDoc with custom document ID instead of addDoc
      const docRef = doc(db, "employees", nextEmployeeId);
      await setDoc(docRef, {
        ...employeeData,
        employeeId: nextEmployeeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Employee saved successfully: ${nextEmployeeId}`);
      
      return { id: nextEmployeeId, employeeId: nextEmployeeId, ...employeeData };
    } catch (e) {
      console.error("❌ Error adding employee: ", e);
      
      // Handle permission errors
      if (e.code === 'permission-denied') {
        console.error("⚠️ FIRESTORE RULES ISSUE DETECTED!");
        console.error("📝 Your Firestore Security Rules are too restrictive.");
        console.error("📖 Fix: Open Firebase Console → Firestore → Rules");
        console.error("📖 Replace with rules from FIRESTORE_RULES_DEPLOYMENT.md");
        throw new Error('Firestore permission denied - update rules in Firebase Console');
      }
      
      throw e;
    }
  },

  updateEmployee: async (id, data) => {
    try {
      // Check if another employee with the same name already exists (excluding current employee)
      if (data.name) {
        const employeesSnapshot = await getDocs(collection(db, "employees"));
        const existingEmployee = employeesSnapshot.docs.find(doc => 
          doc.id !== id && doc.data().name.toLowerCase().trim() === data.name.toLowerCase().trim()
        );
        
        if (existingEmployee) {
          throw new Error(`Another employee with name "${data.name}" already exists!`);
        }
      }
      
      console.log(`🔄 Updating employee: ${id}`);
      
      const refDoc = doc(db, "employees", id);
      await updateDoc(refDoc, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Employee updated: ${id}`);
      
      return { id, ...data };
    } catch (e) {
      console.error("❌ Error updating employee: ", e);
      throw e;
    }
  },

  deleteEmployee: async (id) => {
    const employeeRef = doc(db, "employees", id);
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
      throw new Error("Employee not found");
    }

    const employeeData = employeeSnap.data();
    const employeeName = employeeData?.name || employeeData?.employeeName || "";

    const cascadeDeleteTargets = [
      { collection: "attendance", field: "employeeId" },
      { collection: "salary_reports", field: "employeeId" },
      { collection: "monthly_salary_data", field: "employeeId" },
      { collection: "advance_deduction_history", field: "employeeId" },
      { collection: "advances", field: "employeeId" },
      { collection: "salaryData", field: "employeeId" },
    ];

    for (const target of cascadeDeleteTargets) {
      await deleteCollectionDocs(target.collection, target.field, id);
    }

    if (employeeName) {
      const issuedItemsId = employeeName.replace(/\s+/g, "").toLowerCase();
      await deleteDoc(doc(db, "issuedItems", issuedItemsId));
    }

    await deleteDoc(employeeRef);
    return true;
  },

  // 🧑‍💼 Supervisors
  getSupervisors: async () => {
    const querySnapshot = await getDocs(collection(db, "supervisors"));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  addSupervisor: async (data) => {
    // Create document ID from supervisor email (lowercase, remove special chars except @ and .)
    // e.g., "jadhavvijay9865@gmail.com" -> "jadhavvijay9865@gmail.com"
    const supervisorDocId = data.email.toLowerCase().trim();
    
    console.log('📧 Creating supervisor with email-based document ID:', supervisorDocId);
    console.log('👤 Supervisor data:', data);
    
    // Generate supervisor ID for display (super1, super2, etc.)
    const supervisorsSnapshot = await getDocs(collection(db, "supervisors"));
    const supervisorCount = supervisorsSnapshot.size;
    const nextSupervisorId = `super${supervisorCount + 1}`;
    
    console.log('🆔 Generated supervisor ID:', nextSupervisorId);
    
    // Use setDoc with email-based document ID
    const docRef = doc(db, "supervisors", supervisorDocId);
    await setDoc(docRef, {
      ...data,
      supervisorId: nextSupervisorId,
      createdAt: new Date(),
    });
    
    console.log('✅ Supervisor saved with document ID:', supervisorDocId);
    
    return { id: supervisorDocId, supervisorId: nextSupervisorId, ...data };
  },

  deleteSupervisor: async (id) => {
    await deleteDoc(doc(db, "supervisors", id));
    return true;
  },

  updateSupervisor: async (id, data) => {
    const refDoc = doc(db, "supervisors", id);
    await updateDoc(refDoc, data);
    return { id, ...data };
  },

  // 💾 Image Upload
  uploadImage: async (file) => {
    const storageRef = ref(storage, `employees/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // 💰 Salaries
  getSalaries: async () => {
    const querySnapshot = await getDocs(collection(db, "salaries"));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // 📊 Salary Reports
  getSalaryReports: async () => {
    const querySnapshot = await getDocs(collection(db, "salary_reports"));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  addSalary: async (data) => {
    const docRef = await addDoc(collection(db, "salaries"), {
      ...data,
      createdAt: new Date(),
    });
    return { id: docRef.id, ...data };
  },

  updateSalary: async (id, data) => {
    const refDoc = doc(db, "salaries", id);
    await updateDoc(refDoc, data);
    return { id, ...data };
  },

  deleteSalary: async (id) => {
    await deleteDoc(doc(db, "salaries", id));
    return true;
  },

  // 🕒 Attendance
  getAttendance: async () => {
    const querySnapshot = await getDocs(collection(db, "attendance"));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  getAttendanceWithEmployees: async () => {
    const attendanceSnap = await getDocs(collection(db, "attendance"));
    const employeesSnap = await getDocs(collection(db, "employees"));

    const employees = employeesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const attendance = attendanceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return attendance.map((rec) => ({
      ...rec,
      employeeName: employees.find((e) => e.id === rec.employeeId)?.name || "Unknown",
    }));
  },

  getEmployeeAttendanceStats: async (employeeId) => {
    const q = query(collection(db, "attendance"), where("employeeId", "==", employeeId));
    const snap = await getDocs(q);
    const records = snap.docs.map((doc) => doc.data());

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays = records.filter((r) => r.status === "absent").length;

    return {
      totalDays,
      presentDays,
      absentDays,
      attendancePercentage: totalDays ? ((presentDays / totalDays) * 100).toFixed(1) : "0",
    };
  },
};

const deleteCollectionDocs = async (collectionName, fieldName, value) => {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, where(fieldName, "==", value));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const deletions = snapshot.docs.map((docSnap) => deleteDoc(doc(collectionRef, docSnap.id)));
  await Promise.all(deletions);
};

export default api;

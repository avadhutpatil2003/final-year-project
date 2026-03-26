const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = getFirestore();

// 🔹 हा function दर महिन्याच्या 1 तारखेला चालेल (रात्री 12:00 वाजता)
exports.calculateMonthlySalary = onSchedule("0 0 1 * *", async (event) => {
  console.log("⏳ Monthly salary calculation started at:", new Date().toISOString());

  try {
    const employeesRef = db.collection("employees");
    const attendanceRef = db.collection("attendance");
    const salaryReportsRef = db.collection("monthlyReports");

    const employeesSnapshot = await employeesRef.get();

    if (employeesSnapshot.empty) {
      console.log("⚠️ No employees found in database");
      return;
    }

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const previousMonth = month === 0 ? 11 : month - 1;
    const reportMonth = `${year}-${String(previousMonth + 1).padStart(2, '0')}`;

    let processedCount = 0;
    let errorCount = 0;

    for (const employeeDoc of employeesSnapshot.docs) {
      try {
        const employee = employeeDoc.data();
        const employeeId = employeeDoc.id;

        // मागील महिन्याचे attendance fetch करा
        const attendanceSnapshot = await attendanceRef
          .where("employeeId", "==", employeeId)
          .where("month", "==", reportMonth)
          .get();

        let totalHours = 0;
        let totalDays = 0;

        attendanceSnapshot.forEach((doc) => {
          const data = doc.data();
          totalDays++;
          totalHours += data.workingHours || 0;
        });

        const salaryPerDay = employee.salaryPerDay || 500;
        const totalSalary = totalDays * salaryPerDay;

        // Save report in Firestore
        await salaryReportsRef.doc(`${employeeId}_${reportMonth}`).set({
          employeeId,
          employeeName: employee.name || "Unknown",
          totalPresentDays: totalDays,
          totalWorkingHours: totalHours,
          salaryPerDay,
          totalSalary,
          month: reportMonth,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        processedCount++;
        console.log(`✅ Processed salary for ${employee.name} (${employeeId})`);
      } catch (err) {
        errorCount++;
        console.error(`❌ Error processing employee ${employeeDoc.id}:`, err.message);
      }
    }

    console.log(`✅ Monthly salary calculation completed! Processed: ${processedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error("❌ Fatal error in calculateMonthlySalary:", error);
    throw error;
  }
});


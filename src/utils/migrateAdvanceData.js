import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Migrate advance data from employees collection to advances collection
 * This will create entries in the new 'advances' collection based on employee advance data
 */
export const migrateAdvanceData = async () => {
  try {
    console.log('🔄 Starting advance data migration...');
    
    // Fetch all employees
    const employeesRef = collection(db, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const employeeDoc of employeesSnapshot.docs) {
      const employee = employeeDoc.data();
      const employeeId = employeeDoc.id;
      
      // Check if employee has advance data
      const advanceAmount = parseFloat(employee.advance || 0);
      
      if (advanceAmount > 0) {
        // Create advance entry in new collection - using employee ID as document ID
        const advanceData = {
          employeeId: employeeId,  // Store employee ID, not name
          originalAdvanceAmount: advanceAmount,
          remainingAfterDeduction: parseFloat(employee.advanceRemaining || employee.advance || 0),
          amount: advanceAmount,
          date: employee.lastAdvanceDate 
            ? Timestamp.fromDate(new Date(employee.lastAdvanceDate))
            : Timestamp.now(),
          month: employee.lastAdvanceMonth || new Date().getMonth() + 1,
          year: employee.lastAdvanceYear || new Date().getFullYear(),
          givenBy: 'System Migration',
          reason: 'Migrated from employee record',
          status: 'active',
          createdAt: Timestamp.now(),
          migratedFrom: 'employees_collection'
        };
        
        // Add to advances collection
        await addDoc(collection(db, 'advances'), advanceData);
        
        console.log(`✅ Migrated: ${employee.name} - ₹${advanceAmount}`);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Migration Complete!`);
    console.log(`   Migrated: ${migratedCount} employees`);
    console.log(`   Skipped: ${skippedCount} employees (no advance)`);
    
    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount
    };
    
  } catch (error) {
    console.error('❌ Migration Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check migration status
 */
export const checkMigrationStatus = async () => {
  try {
    const advancesRef = collection(db, 'advances');
    const snapshot = await getDocs(advancesRef);
    
    const migratedRecords = snapshot.docs.filter(doc => 
      doc.data().migratedFrom === 'employees_collection'
    );
    
    return {
      totalAdvances: snapshot.size,
      migratedRecords: migratedRecords.length,
      needsMigration: migratedRecords.length === 0
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return null;
  }
};

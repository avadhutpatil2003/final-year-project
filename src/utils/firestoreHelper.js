import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Enhanced Firestore Helper with proper data validation and logging
 */

// ✅ Add new document with validation
export const addFirestoreData = async (collectionName, data) => {
  try {
    console.log(`📝 Adding to ${collectionName}:`, data);
    
    // Validate data
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be a valid object');
    }

    // Add timestamps
    const dataWithTimestamp = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add document
    const docRef = await addDoc(collection(db, collectionName), dataWithTimestamp);
    
    console.log(`✅ Document added to ${collectionName} with ID:`, docRef.id);
    
    return {
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...data }
    };
  } catch (error) {
    console.error(`❌ Error adding to ${collectionName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ Set document with custom ID
export const setFirestoreData = async (collectionName, docId, data, merge = false) => {
  try {
    console.log(`📝 Setting ${collectionName}/${docId}:`, data);
    
    if (!docId || !data) {
      throw new Error('Document ID and data are required');
    }

    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    // If not merging and it's a new document, add createdAt
    if (!merge && !data.createdAt) {
      dataWithTimestamp.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, collectionName, docId), dataWithTimestamp, { merge });
    
    console.log(`✅ Document set in ${collectionName}/${docId}`);
    
    return {
      success: true,
      id: docId,
      data: { id: docId, ...data }
    };
  } catch (error) {
    console.error(`❌ Error setting ${collectionName}/${docId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ Update document
export const updateFirestoreData = async (collectionName, docId, data) => {
  try {
    console.log(`🔄 Updating ${collectionName}/${docId}:`, data);
    
    if (!docId) {
      throw new Error('Document ID is required');
    }

    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, collectionName, docId), dataWithTimestamp);
    
    console.log(`✅ Document updated in ${collectionName}/${docId}`);
    
    return {
      success: true,
      id: docId,
      data: { id: docId, ...data }
    };
  } catch (error) {
    console.error(`❌ Error updating ${collectionName}/${docId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ Delete document
export const deleteFirestoreData = async (collectionName, docId) => {
  try {
    console.log(`🗑️ Deleting ${collectionName}/${docId}`);
    
    if (!docId) {
      throw new Error('Document ID is required');
    }

    await deleteDoc(doc(db, collectionName, docId));
    
    console.log(`✅ Document deleted from ${collectionName}/${docId}`);
    
    return {
      success: true,
      id: docId
    };
  } catch (error) {
    console.error(`❌ Error deleting ${collectionName}/${docId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ Batch save multiple documents
export const batchSaveFirestoreData = async (operations) => {
  try {
    console.log(`📦 Starting batch save for ${operations.length} operations`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const operation of operations) {
      const { type, collection: collectionName, docId, data } = operation;
      
      let result;
      
      if (type === 'add') {
        result = await addFirestoreData(collectionName, data);
      } else if (type === 'set') {
        result = await setFirestoreData(collectionName, docId, data);
      } else if (type === 'update') {
        result = await updateFirestoreData(collectionName, docId, data);
      } else if (type === 'delete') {
        result = await deleteFirestoreData(collectionName, docId);
      }

      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`✅ Batch save completed: ${successCount} success, ${errorCount} errors`);
    
    return {
      success: errorCount === 0,
      totalOperations: operations.length,
      successCount,
      errorCount,
      results
    };
  } catch (error) {
    console.error('❌ Error in batch save:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ Save with retry logic
export const saveWithRetry = async (collectionName, docId, data, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📝 Save attempt ${attempt}/${maxRetries} for ${collectionName}/${docId}`);
      
      if (docId) {
        return await setFirestoreData(collectionName, docId, data);
      } else {
        return await addFirestoreData(collectionName, data);
      }
    } catch (error) {
      console.error(`⚠️ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} attempts failed`);
        return {
          success: false,
          error: `Failed after ${maxRetries} attempts: ${error.message}`
        };
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// ✅ Validate and save
export const validateAndSave = async (collectionName, data, schema) => {
  try {
    console.log(`🔍 Validating data for ${collectionName}`);
    
    // Check required fields
    if (schema && schema.required) {
      for (const field of schema.required) {
        if (!data[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    // Type validation
    if (schema && schema.fields) {
      for (const [field, type] of Object.entries(schema.fields)) {
        if (data[field] && typeof data[field] !== type) {
          throw new Error(`Invalid type for ${field}. Expected ${type}, got ${typeof data[field]}`);
        }
      }
    }

    console.log(`✅ Validation passed for ${collectionName}`);
    
    // Save data
    return await addFirestoreData(collectionName, data);
  } catch (error) {
    console.error(`❌ Validation failed for ${collectionName}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

const firestoreHelper = {
  addFirestoreData,
  setFirestoreData,
  updateFirestoreData,
  deleteFirestoreData,
  batchSaveFirestoreData,
  saveWithRetry,
  validateAndSave
};

export default firestoreHelper;

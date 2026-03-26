import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Create new document in any collection
export const createNewCollection = async (collectionName, data) => {
  try {
    console.log(`📝 Adding to ${collectionName}:`, data);
    
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("✅ Document added with ID: ", docRef.id);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("❌ Error adding document: ", error);
    // Enhanced error handling for Firestore connection issues
    if (error.code === 'unavailable') {
      return { success: false, error: 'Firestore service is currently unavailable. Please try again later.' };
    } else if (error.code === 'permission-denied') {
      return { success: false, error: 'Permission denied. Please check Firestore security rules.' };
    }
    return { success: false, error: error.message };
  }
};

// Get all documents from collection
export const getCollectionData = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: documents };
  } catch (error) {
    console.error("Error getting documents: ", error);
    return { success: false, error: error.message };
  }
};

// Update document
export const updateCollectionData = async (collectionName, docId, data) => {
  try {
    console.log(`🔄 Updating ${collectionName}/${docId}:`, data);
    
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Document updated: ${collectionName}/${docId}`);
    
    return { success: true };
  } catch (error) {
    console.error("❌ Error updating document: ", error);
    return { success: false, error: error.message };
  }
};

// Delete document
export const deleteCollectionData = async (collectionName, docId) => {
  try {
    console.log(`🗑️ Deleting ${collectionName}/${docId}`);
    
    await deleteDoc(doc(db, collectionName, docId));
    
    console.log(`✅ Document deleted: ${collectionName}/${docId}`);
    
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting document: ", error);
    return { success: false, error: error.message };
  }
};

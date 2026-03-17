import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  getDocs, 
  collection 
} from "firebase/firestore";

// Utility function to handle Firestore operations with retry logic
export const firestoreWithRetry = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain errors
      if (error.code === 'resource-exhausted' || 
          error.code === 'permission-denied' || 
          error.code === 'not-found') {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Firestore operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Enhanced error handler for Firestore operations
export const handleFirestoreError = (error, context = "Firestore operation") => {
  console.error(`${context}:`, error);
  
  const errorMessages = {
    'resource-exhausted': {
      title: "🚨 Firebase Quota Exceeded!",
      message: "Firebase च्या daily limits संपले आहेत.\nकृपया उद्या पुन्हा प्रयत्न करा किंवा Firebase plan upgrade करा.\n\nDaily Limits:\n• Writes: 20,000\n• Reads: 50,000",
      severity: "high"
    },
    'permission-denied': {
      title: "❌ Permission Denied!",
      message: "Firebase database access नाही.\nकृपया admin शी संपर्क साधा.",
      severity: "high"
    },
    'unavailable': {
      title: "🔄 Service Unavailable!",
      message: "Firebase service temporarily unavailable.\nकृपया काही वेळाने प्रयत्न करा.",
      severity: "medium"
    },
    'cancelled': {
      title: "⏹️ Operation Cancelled!",
      message: "Operation cancelled due to timeout.\nकृपया पुन्हा प्रयत्न करा.",
      severity: "medium"
    },
    'deadline-exceeded': {
      title: "⏰ Timeout Error!",
      message: "Operation took too long to complete.\nकृपया internet connection तपासा.",
      severity: "medium"
    },
    'not-found': {
      title: "🔍 Data Not Found!",
      message: "Requested data not found.\nकृपया data exist करतो का ते तपासा.",
      severity: "low"
    }
  };
  
  const errorInfo = errorMessages[error.code] || {
    title: "❌ Unknown Error!",
    message: `Error: ${error.message}\n\nकृपया पुन्हा प्रयत्न करा.`,
    severity: "medium"
  };
  
  return {
    ...errorInfo,
    code: error.code,
    originalMessage: error.message
  };
};

// Batch operations helper to reduce quota usage
export const batchFirestoreOperations = async (operations, batchSize = 5) => {
  const results = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(op => firestoreWithRetry(op))
    );
    results.push(...batchResults);
    
    // Add small delay between batches to avoid overwhelming Firestore
    if (i + batchSize < operations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};

// Optimized read operations with caching
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cachedFirestoreRead = async (docRef, forceRefresh = false) => {
  const cacheKey = docRef.path;
  const now = Date.now();
  
  if (!forceRefresh && cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (now - timestamp < CACHE_DURATION) {
      console.log(`Using cached data for: ${cacheKey}`);
      return { exists: () => !!data, data: () => data };
    }
  }
  
  try {
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : null;
    
    cache.set(cacheKey, { data, timestamp: now });
    return docSnap;
  } catch (error) {
    // If cache exists and read fails, return cached data
    if (cache.has(cacheKey)) {
      console.warn(`Firestore read failed, using cached data for: ${cacheKey}`);
      const { data } = cache.get(cacheKey);
      return { exists: () => !!data, data: () => data };
    }
    throw error;
  }
};

// Clear cache function
export const clearFirestoreCache = () => {
  cache.clear();
  console.log("Firestore cache cleared");
};

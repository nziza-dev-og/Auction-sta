/**
   * Utility functions to safely handle Firestore timestamps and data conversion
 */

type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
} | null | undefined;

/**
 * Safely converts a Firestore timestamp to a JavaScript Date
 * Handles different formats of timestamps that may come from Firestore
 */
export const toDate = (timestamp: FirestoreTimestamp): Date | null => {
  if (!timestamp) return null;
  
  try {
    // Case 1: Firestore timestamp with toDate function
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Case 2: Firestore timestamp-like object with seconds and nanoseconds
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
  } catch (error) {
    console.error('Error converting timestamp:', error);
  }
  
  return null;
};

/**
 * Creates a Firestore-compatible timestamp object from a JavaScript Date
 */
export const fromDate = (date: Date): { seconds: number; nanoseconds: number } => {
  if (!date || isNaN(date.getTime())) {
    // Return current date if invalid
    const now = new Date();
    return {
      seconds: Math.floor(now.getTime() / 1000),
      nanoseconds: now.getMilliseconds() * 1000000
    };
  }
  
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: date.getMilliseconds() * 1000000
  };
};

/**
 * Safely formats a Firestore timestamp to a localized date string
 */
export const formatTimestamp = (timestamp: FirestoreTimestamp, options?: Intl.DateTimeFormatOptions): string => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  try {
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Safely formats a Firestore timestamp to a localized time string
 */
export const formatTime = (timestamp: FirestoreTimestamp, options?: Intl.DateTimeFormatOptions): string => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  try {
    return date.toLocaleTimeString(undefined, options);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid time';
  }
};

/**
 * Safely formats a Firestore timestamp to a localized date and time string
 */
export const formatDateTime = (timestamp: FirestoreTimestamp): string => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  try {
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a date for use in HTML datetime-local inputs
 */
export const formatDateForInput = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return new Date().toISOString().substring(0, 16);
  }
  try {
    // Format as YYYY-MM-DDThh:mm
    return date.toISOString().substring(0, 16);
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return new Date().toISOString().substring(0, 16);
  }
};
 
import  { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  address: string | null;
  isAdmin: boolean;
  notifications?: any[];
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string, isAdmin: boolean, adminCode?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext) as AuthContextType;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCode, setAdminCode] = useState("admin123"); // Default admin code

  async function signup(email: string, password: string, displayName: string, isAdmin: boolean, adminCodeInput?: string) {
    if (isAdmin && adminCodeInput !== adminCode) {
      throw new Error('Invalid admin code');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    const userData = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName,
      phoneNumber: '',
      address: '',
      isAdmin,
      notifications: []
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    
    if (isAdmin) {
      try {
        const settingsDoc = await getDoc(doc(db, 'adminSettings', 'config'));
        if (!settingsDoc.exists()) {
          await setDoc(doc(db, 'adminSettings', 'config'), {
            adminCode
          });
        }
      } catch (error) {
        console.error("Error checking admin settings:", error);
        // Create admin settings if it fails to check
        await setDoc(doc(db, 'adminSettings', 'config'), {
          adminCode
        });
      }
    }
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function updateUserProfile(data: Partial<UserData>) {
    if (!currentUser) return;
    
    await updateDoc(doc(db, 'users', currentUser.uid), data);
    
    if (userData) {
      setUserData({ ...userData, ...data });
    }
    
    // Update display name in auth profile if changed
    if (data.displayName && data.displayName !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: data.displayName });
    }
  }

  async function fetchAdminCode() {
    try {
      const docRef = doc(db, 'adminSettings', 'config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setAdminCode(docSnap.data().adminCode);
      }
    } catch (error) {
      console.error("Error fetching admin code:", error);
    }
  }

  async function fetchUserData(user: User) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure all required fields are present to prevent undefined property access
        setUserData({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          isAdmin: data.isAdmin || false,
          notifications: data.notifications || []
        } as UserData);
      } else {
        // If user document doesn't exist, create one
        const defaultUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: '',
          address: '',
          isAdmin: false,
          notifications: []
        };
        
        setUserData(defaultUserData);
        await setDoc(docRef, defaultUserData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Provide default user data if fetch fails to prevent subsequent errors
      setUserData({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: '',
        address: '',
        isAdmin: false,
        notifications: []
      });
    }
  }

  useEffect(() => {
    fetchAdminCode();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
 
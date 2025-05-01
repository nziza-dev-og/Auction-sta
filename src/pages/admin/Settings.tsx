import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Key, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { userData } = useAuth();
  const [adminCode, setAdminCode] = useState('');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [confirmAdminCode, setConfirmAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAdminSettings = async () => {
      if (!userData?.isAdmin) return;
      
      setLoading(true);
      
      try {
        const settingsDoc = await getDoc(doc(db, 'adminSettings', 'config'));
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setAdminCode(data.adminCode || 'admin123');
        } else {
          // Default admin code if no settings exist
          setAdminCode('admin123');
        }
      } catch (error) {
        console.error('Error fetching admin settings:', error);
        toast.error('Failed to load admin settings');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminSettings();
  }, [userData]);

  const handleChangeAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData?.isAdmin) {
      toast.error('Unauthorized action');
      return;
    }
    
    if (newAdminCode !== confirmAdminCode) {
      toast.error('Admin codes do not match');
      return;
    }
    
    if (newAdminCode.trim().length < 6) {
      toast.error('Admin code must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'adminSettings', 'config'), {
        adminCode: newAdminCode
      });
      
      setAdminCode(newAdminCode);
      setNewAdminCode('');
      setConfirmAdminCode('');
      
      toast.success('Admin code updated successfully');
    } catch (error) {
      console.error('Error updating admin code:', error);
      toast.error('Failed to update admin code');
    } finally {
      setSaving(false);
    }
  };

  // Ensure user is admin
  if (!userData?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You do not have permission to access the admin settings.</p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <Settings className="h-5 w-5 text-gray-500 mr-2" />
              Admin Access Settings
            </h2>
            
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Admin Code</h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showAdminCode ? "text" : "password"}
                  className="input pl-10 pr-10 bg-gray-100"
                  value={adminCode}
                  readOnly
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowAdminCode(!showAdminCode)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showAdminCode ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                This code is required when registering new admin accounts
              </p>
            </div>
            
            <form onSubmit={handleChangeAdminCode}>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Change Admin Code</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="newAdminCode" className="block text-sm font-medium text-gray-700 mb-1">
                    New Admin Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="newAdminCode"
                      type={showAdminCode ? "text" : "password"}
                      value={newAdminCode}
                      onChange={(e) => setNewAdminCode(e.target.value)}
                      className="input pl-10"
                      placeholder="Enter new admin code"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="confirmAdminCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Admin Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmAdminCode"
                      type={showAdminCode ? "text" : "password"}
                      value={confirmAdminCode}
                      onChange={(e) => setConfirmAdminCode(e.target.value)}
                      className="input pl-10"
                      placeholder="Confirm new admin code"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="btn btn-primary w-full flex items-center justify-center"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
 
import  { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Clock, User, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toDate, formatDateTime } from '../utils/firestoreConverters';

interface Bid {
  userId: string;
  userName: string;
  amount: number;
  timestamp: any;
}

interface UserDetail {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  address: string;
}

interface BidHistoryProps {
  productId: string;
  showDetailedUserInfo?: boolean;
}

export default function BidHistory({ productId, showDetailedUserInfo = false }: BidHistoryProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchBids = async () => {
      try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const bidsData = productData.bids || [];
          
          // Process bids to ensure timestamp compatibility before sorting
          const processedBids = bidsData.map((bid: any) => ({
            ...bid,
            // Use safe timestamp conversion
            timestamp: toDate(bid.timestamp) || new Date()
          }));
          
          // Sort by timestamp
          const sortedBids = [...processedBids].sort((a, b) => {
            return b.timestamp.getTime() - a.timestamp.getTime(); // Descending order (newest first)
          });
          
          setBids(sortedBids);
          
          // If detailed info is needed, fetch user details
          if (showDetailedUserInfo) {
            const userIds = sortedBids.map((bid: any) => bid.userId).filter(Boolean);
            const uniqueUserIds = [...new Set(userIds)];
            
            const userDetailsMap: Record<string, UserDetail> = {};
            
            for (const userId of uniqueUserIds) {
              try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  userDetailsMap[userId] = {
                    uid: userId,
                    displayName: userData.displayName || 'Unknown User',
                    email: userData.email || '',
                    phoneNumber: userData.phoneNumber || '',
                    address: userData.address || ''
                  };
                }
              } catch (error) {
                console.error(`Error fetching user details for ${userId}:`, error);
              }
            }
            
            setUserDetails(userDetailsMap);
          }
        }
      } catch (error) {
        console.error('Error fetching bid history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, [productId, showDetailedUserInfo]);

  if (loading) {
    return <div className="text-center py-4">Loading bid history...</div>;
  }

  if (bids.length === 0) {
    return <div className="text-center py-4 text-gray-500">No bids yet. Be the first to bid!</div>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-3">Bid History</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {bids.map((bid, index) => (
          <div key={index} className="relative">
            <div 
              className={`flex items-center justify-between p-3 bg-gray-50 rounded-md ${
                bid.userId === currentUser?.uid ? 'bg-primary-50' : ''
              }`}
              onClick={() => showDetailedUserInfo ? setSelectedBid(selectedBid === bid.userId ? null : bid.userId) : null}
            >
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-500 mr-2" />
                <span className="font-medium">
                  {bid.userId === currentUser?.uid ? 'You' : bid.userName || 'Anonymous User'}
                  {index === 0 && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Highest Bid
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-primary-600">${bid.amount.toLocaleString()}</span>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{formatDateTime(bid.timestamp)}</span>
                </div>
              </div>
            </div>
            
            {/* User details panel for admins */}
            {showDetailedUserInfo && selectedBid === bid.userId && userDetails[bid.userId] && (
              <div className="mt-1 mb-3 p-3 bg-gray-100 rounded-md text-sm">
                <h4 className="font-medium mb-2">Bidder Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-500 mr-2" />
                    <span>{userDetails[bid.userId].displayName}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-500 mr-2" />
                    <span>{userDetails[bid.userId].email}</span>
                  </div>
                  {userDetails[bid.userId].phoneNumber && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-500 mr-2" />
                      <span>{userDetails[bid.userId].phoneNumber}</span>
                    </div>
                  )}
                  {userDetails[bid.userId].address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <span>{userDetails[bid.userId].address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
 
import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { User, FileText, Clock, Bell, ShoppingBag } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Dashboard() {
  const { userData } = useAuth();
  const [activeBids, setActiveBids] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userData) return;
      
      setLoading(true);
      
      try {
        // Fetch user's active bids count
        const bidsQuery = query(
          collection(db, 'users', userData.uid, 'bids'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        
        const bidsSnapshot = await getDocs(bidsQuery);
        setActiveBids(bidsSnapshot.size);
        
        // Get the most recent bids with product details
        const bidsWithDetails = [];
        
        for (const bidDoc of bidsSnapshot.docs) {
          const bidData = bidDoc.data();
          
          // Get product details
          try {
            const productDoc = await getDocs(query(
              collection(db, 'products'),
              where('__name__', '==', bidData.productId)
            ));
            
            if (!productDoc.empty) {
              const productData = productDoc.docs[0].data();
              
              bidsWithDetails.push({
                id: bidDoc.id,
                productId: bidData.productId,
                amount: bidData.amount,
                timestamp: bidData.timestamp?.toDate(),
                productTitle: productData.title,
                productImage: productData.imageUrl,
                currentBid: productData.currentBid
              });
            }
          } catch (error) {
            console.error('Error fetching product details:', error);
          }
        }
        
        setRecentBids(bidsWithDetails);
        
        // Fetch user's notifications count
        const notificationsQuery = query(
          collection(db, 'users', userData.uid, 'notifications'),
          where('read', '==', false)
        );
        
        const notificationsSnapshot = await getDocs(notificationsQuery);
        setNotifications(notificationsSnapshot.size);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userData]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-start">
            <div className="bg-primary-100 p-3 rounded-full">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-medium text-gray-900">Profile</h2>
              <p className="text-gray-600 mt-1">Manage your personal information</p>
              <Link to="/profile" className="mt-3 inline-block text-primary-600 hover:underline">
                View Profile
              </Link>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-start">
            <div className="bg-secondary-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-medium text-gray-900">Your Bids</h2>
              <p className="text-gray-600 mt-1">You have {activeBids} active bids</p>
              <Link to="/my-bids" className="mt-3 inline-block text-secondary-600 hover:underline">
                View All Bids
              </Link>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-start">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Bell className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
              <p className="text-gray-600 mt-1">You have {notifications} unread notifications</p>
              <Link to="/notifications" className="mt-3 inline-block text-yellow-600 hover:underline">
                View Notifications
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Bids</h2>
        
        {recentBids.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Bid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Bid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBids.map((bid) => (
                  <tr key={bid.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img 
                            src={bid.productImage || 'https://via.placeholder.com/40'} 
                            alt={bid.productTitle}
                            className="h-10 w-10 rounded-full object-cover" 
                          />
                        </div>
                        <div className="ml-4">
                          <Link 
                            to={`/product/${bid.productId}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {bid.productTitle}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${bid.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${bid.currentBid.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bid.amount >= bid.currentBid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {bid.amount >= bid.currentBid ? 'Winning' : 'Outbid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bid.timestamp ? bid.timestamp.toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No bids yet</h3>
            <p className="text-gray-500 mt-1">Start bidding on items to see your activity here.</p>
            <Link to="/" className="mt-4 btn btn-primary inline-block">
              Browse Auctions
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
 
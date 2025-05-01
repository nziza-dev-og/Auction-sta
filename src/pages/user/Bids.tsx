import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Filter, Search, ShoppingBag } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Bid {
  id: string;
  productId: string;
  amount: number;
  timestamp: Date;
  product: {
    title: string;
    imageUrl: string;
    currentBid: number;
    endsAt: Date;
    status: 'active' | 'ended';
    isWinning: boolean;
  };
}

export default function UserBids() {
  const { userData } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, ended, winning
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBids = async () => {
      if (!userData) return;
      
      setLoading(true);
      
      try {
        const userBidsQuery = query(
          collection(db, 'users', userData.uid, 'bids'),
          orderBy('timestamp', 'desc')
        );
        
        const bidsSnapshot = await getDocs(userBidsQuery);
        
        const bidsWithProducts: Bid[] = [];
        
        for (const bidDoc of bidsSnapshot.docs) {
          const bidData = bidDoc.data();
          
          try {
            const productDoc = await getDoc(doc(db, 'products', bidData.productId));
            
            if (productDoc.exists()) {
              const productData = productDoc.data();
              const now = new Date();
              const endsAt = productData.endsAt.toDate();
              const isActive = endsAt > now;
              
              bidsWithProducts.push({
                id: bidDoc.id,
                productId: bidData.productId,
                amount: bidData.amount,
                timestamp: bidData.timestamp.toDate(),
                product: {
                  title: productData.title,
                  imageUrl: productData.imageUrl,
                  currentBid: productData.currentBid,
                  endsAt,
                  status: isActive ? 'active' : 'ended',
                  isWinning: bidData.amount >= productData.currentBid
                }
              });
            }
          } catch (error) {
            console.error('Error fetching product details:', error);
          }
        }
        
        setBids(bidsWithProducts);
      } catch (error) {
        console.error('Error fetching user bids:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, [userData]);

  const filteredBids = bids.filter((bid) => {
    if (filter === 'active' && bid.product.status !== 'active') return false;
    if (filter === 'ended' && bid.product.status !== 'ended') return false;
    if (filter === 'winning' && (!bid.product.isWinning || bid.product.status !== 'active')) return false;
    
    return bid.product.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Bids</h1>
      
      <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search items..."
            className="input pl-10 w-full md:w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="relative">
          <select
            className="input pl-10 appearance-none w-full md:w-48"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Bids</option>
            <option value="active">Active Auctions</option>
            <option value="ended">Ended Auctions</option>
            <option value="winning">Currently Winning</option>
          </select>
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      {filteredBids.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBids.map((bid) => (
                <tr key={bid.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          src={bid.product.imageUrl || 'https://via.placeholder.com/40'} 
                          alt={bid.product.title}
                          className="h-10 w-10 rounded-full object-cover" 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{bid.product.title}</div>
                        <div className="text-xs text-gray-500">
                          Bid on {bid.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${bid.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${bid.product.currentBid.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {bid.product.status === 'active' ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bid.product.isWinning 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {bid.product.isWinning ? 'Winning' : 'Outbid'}
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Ended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{bid.product.endsAt.toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                      to={`/product/${bid.productId}`} 
                      className="text-primary-600 hover:text-primary-900"
                    >
                      View Item
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No bids found</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            {bids.length > 0 
              ? "No bids match your current filter criteria." 
              : "You haven't placed any bids yet. Start bidding on items you're interested in!"}
          </p>
          <Link to="/" className="mt-4 btn btn-primary inline-block">
            Browse Auctions
          </Link>
        </div>
      )}
    </div>
  );
}
 
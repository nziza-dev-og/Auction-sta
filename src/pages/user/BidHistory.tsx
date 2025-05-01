import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter, Clock, User } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface ProductBid {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  userBid: number | null; // Your bid amount, null if you haven't bid
  bids: {
    userId: string;
    userName: string;
    amount: number;
    timestamp: Date;
  }[];
  endsAt: Date;
  status: 'active' | 'ended';
}

export default function BidHistory() {
  const { userData } = useAuth();
  const [products, setProducts] = useState<ProductBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, participated
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBidHistory = async () => {
      if (!userData) return;
      
      setLoading(true);
      
      try {
        // First get all products the user has bid on
        const userBidsQuery = query(
          collection(db, 'users', userData.uid, 'bids'),
          orderBy('timestamp', 'desc')
        );
        
        const userBidsSnapshot = await getDocs(userBidsQuery);
        const userBidProductIds = new Set<string>();
        const userBidAmounts = new Map<string, number>();
        
        userBidsSnapshot.forEach((doc) => {
          const data = doc.data();
          userBidProductIds.add(data.productId);
          
          // Store the user's highest bid for each product
          const existingAmount = userBidAmounts.get(data.productId);
          if (!existingAmount || data.amount > existingAmount) {
            userBidAmounts.set(data.productId, data.amount);
          }
        });
        
        // Now fetch detailed information about these products including all bids
        const productsData: ProductBid[] = [];
        
        for (const productId of userBidProductIds) {
          try {
            const productDoc = await getDoc(doc(db, 'products', productId));
            
            if (productDoc.exists()) {
              const productData = productDoc.data();
              const now = new Date();
              const endsAt = productData.endsAt.toDate();
              
              // Process bids
              const bids = (productData.bids || []).map((bid: any) => ({
                userId: bid.userId,
                userName: bid.userName,
                amount: bid.amount,
                timestamp: bid.timestamp.toDate()
              }));
              
              // Sort bids by amount in descending order
              bids.sort((a: any, b: any) => b.amount - a.amount);
              
              productsData.push({
                id: productDoc.id,
                productId,
                productTitle: productData.title,
                productImage: productData.imageUrl,
                userBid: userBidAmounts.get(productId) || null,
                bids,
                endsAt,
                status: endsAt > now ? 'active' : 'ended'
              });
            }
          } catch (error) {
            console.error(`Error fetching product ${productId}:`, error);
          }
        }
        
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching bid history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBidHistory();
  }, [userData]);

  // Filter products based on search and filter
  const filteredProducts = products.filter((product) => {
    if (filter === 'participated' && !product.userBid) return false;
    
    return product.productTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Bid History</h1>
      
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
            <option value="all">All Items</option>
            <option value="participated">My Bids Only</option>
          </select>
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      {filteredProducts.length > 0 ? (
        <div className="space-y-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img 
                      src={product.productImage || 'https://via.placeholder.com/40'} 
                      alt={product.productTitle}
                      className="h-12 w-12 rounded-lg object-cover mr-4" 
                    />
                    <div>
                      <Link 
                        to={`/product/${product.productId}`}
                        className="text-lg font-medium text-gray-900 hover:text-primary-600"
                      >
                        {product.productTitle}
                      </Link>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          {product.status === 'active' 
                            ? `Ends on ${product.endsAt.toLocaleDateString()}` 
                            : `Ended on ${product.endsAt.toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.status === 'active' ? 'Active' : 'Ended'}
                    </span>
                  </div>
                </div>
                
                {product.userBid && (
                  <div className="mt-3 p-2 bg-primary-50 rounded-md">
                    <p className="text-sm text-primary-700">
                      Your bid: <span className="font-semibold">${product.userBid.toLocaleString()}</span>
                      {product.bids.length > 0 && product.bids[0].amount === product.userBid ? (
                        <span className="ml-2 text-green-600 font-medium">
                          (Highest Bid)
                        </span>
                      ) : (
                        product.bids.length > 0 && (
                          <span className="ml-2 text-gray-600">
                            (Highest bid is ${product.bids[0].amount.toLocaleString()})
                          </span>
                        )
                      )}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Bid History</h3>
                {product.bids.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {product.bids.map((bid, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-md ${
                          bid.userId === userData?.uid ? 'bg-primary-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-500 mr-2" />
                          <span className={`text-sm ${bid.userId === userData?.uid ? 'font-semibold' : ''}`}>
                            {bid.userId === userData?.uid ? 'You' : bid.userName}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-primary-700">${bid.amount.toLocaleString()}</span>
                          <span className="text-xs text-gray-500">
                            {bid.timestamp.toLocaleDateString()} at {bid.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No bids yet on this item.</p>
                )}
                
                <div className="mt-4 text-right">
                  <Link 
                    to={`/product/${product.productId}`}
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    View Full Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No bid history found</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            {products.length > 0 
              ? "No items match your current filter criteria." 
              : "You haven't participated in any auctions yet."}
          </p>
          <Link to="/" className="mt-4 btn btn-primary inline-block">
            Browse Auctions
          </Link>
        </div>
      )}
    </div>
  );
}
 
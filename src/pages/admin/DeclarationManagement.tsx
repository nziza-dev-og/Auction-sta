import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter, Award, User, Clock, Eye, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { toDate, fromDate } from '../../utils/firestoreConverters';

interface Product {
  id: string;
  title: string;
  imageUrl: string;
  currentBid: number;
  endsAt: Date;
  category: string;
  isWinnerDeclared: boolean;
  highestBidder: {
    userId: string;
    userName: string;
    amount: number;
  } | null;
  bids: {
    userId: string;
    userName: string;
    amount: number;
    timestamp: any;
  }[];
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  address: string;
}

export default function DeclarationManagement() {
  const { userData } = useAuth();
  const [endedProducts, setEndedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [winnerDetails, setWinnerDetails] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('pending'); // all, pending, declared

  useEffect(() => {
    const fetchEndedAuctions = async () => {
      if (!userData?.isAdmin) return;
      
      setLoading(true);
      
      try {
        // Get all products
        const productsQuery = query(
          collection(db, 'products'),
          orderBy('endsAt', 'desc')
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        const productsData: Product[] = [];
        const now = new Date();
        
        for (const productDoc of productsSnapshot.docs) {
          const data = productDoc.data();
          
          // Use safe timestamp conversion
          const endsAt = toDate(data.endsAt);
          if (!endsAt || endsAt > now) continue; // Skip if not ended yet
          
          // Process bids to find highest bidder
          let highestBidder = null;
          const bids = data.bids || [];
          
          if (bids.length > 0) {
            // Sort bids by amount (highest first)
            const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
            highestBidder = {
              userId: sortedBids[0].userId,
              userName: sortedBids[0].userName,
              amount: sortedBids[0].amount
            };
          }
          
          // Process each bid to ensure timestamp is valid
          const processedBids = (data.bids || []).map((bid: any) => {
            let timestamp;
            try {
              timestamp = toDate(bid.timestamp) || new Date();
            } catch (error) {
              console.error('Error processing bid timestamp:', error);
              timestamp = new Date();
            }
            
            return {
              ...bid,
              timestamp
            };
          });
          
          productsData.push({
            id: productDoc.id,
            title: data.title || 'Unnamed Product',
            imageUrl: data.imageUrl || '',
            currentBid: data.currentBid || 0,
            endsAt: endsAt,
            category: data.category || 'Uncategorized',
            isWinnerDeclared: data.winnerDeclared || false,
            highestBidder,
            bids: processedBids
          });
        }
        
        setEndedProducts(productsData);
      } catch (error) {
        console.error('Error fetching ended auctions:', error);
        toast.error('Error fetching ended auctions');
      } finally {
        setLoading(false);
      }
    };

    fetchEndedAuctions();
  }, [userData]);

  const fetchWinnerDetails = async (userId: string) => {
    setDetailsLoading(true);
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        setWinnerDetails(userDoc.data() as User);
      } else {
        setWinnerDetails(null);
        toast.error('User details not found');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    
    if (product.highestBidder) {
      fetchWinnerDetails(product.highestBidder.userId);
    } else {
      setWinnerDetails(null);
    }
  };

  const declareWinner = async (productId: string, winnerUserId: string, amount: number) => {
    if (!userData?.isAdmin || !winnerUserId) {
      toast.error('Unable to declare winner: Missing required information');
      return;
    }
    
    try {
      // Create properly formatted Firestore timestamp for notifications
      const firestoreTimestamp = fromDate(new Date());
      
      // Update product with winner info - explicitly set all fields to prevent undefined errors
      await updateDoc(doc(db, 'products', productId), {
        winnerDeclared: true,
        winnerId: winnerUserId,
        winnerAmount: amount,
        winnerName: winnerDetails?.displayName || 'Unknown Winner'
      });
      
      // Add notification to winner with proper timestamp format
      await updateDoc(doc(db, 'users', winnerUserId), {
        notifications: arrayUnion({
          title: 'Auction Won!',
          message: `Congratulations! You've won the auction for ${selectedProduct?.title} with a bid of $${amount.toLocaleString()}`,
          type: 'bid_won',
          read: false,
          createdAt: firestoreTimestamp,
          productId
        })
      });
      
      toast.success('Winner declared successfully');
      
      // Update local state
      setEndedProducts(
        endedProducts.map((product) =>
          product.id === productId
            ? { ...product, isWinnerDeclared: true }
            : product
        )
      );
      
      if (selectedProduct) {
        setSelectedProduct({
          ...selectedProduct,
          isWinnerDeclared: true
        });
      }
    } catch (error) {
      console.error('Error declaring winner:', error);
      toast.error('Failed to declare winner');
    }
  };

  // Filter products
  const filteredProducts = endedProducts.filter((product) => {
    if (filter === 'pending' && product.isWinnerDeclared) return false;
    if (filter === 'declared' && !product.isWinnerDeclared) return false;
    
    if (!product.title) return false;
    return product.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  // Ensure user is admin
  if (!userData?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You do not have permission to access the declaration management.</p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Declaration Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search products..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="relative w-full md:w-48">
              <select
                className="input pl-10 appearance-none w-full"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Ended Auctions</option>
                <option value="pending">Pending Declaration</option>
                <option value="declared">Winner Declared</option>
              </select>
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {filteredProducts.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Final Bid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Highest Bidder
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr 
                        key={product.id}
                        className={selectedProduct?.id === product.id ? "bg-blue-50" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img 
                                src={product.imageUrl || 'https://images.unsplash.com/photo-1495704907664-81f74a7efd9b?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw1fHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3'} 
                                alt={product.title}
                                className="h-10 w-10 rounded-full object-cover" 
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.title}</div>
                              <div className="text-xs text-gray-500">{product.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${product.currentBid.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.highestBidder ? (
                            <div className="flex items-center text-sm text-gray-900">
                              <User className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{product.highestBidder.userName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No bidders</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{product.endsAt.toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.isWinnerDeclared 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.isWinnerDeclared ? 'Winner Declared' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="text-primary-600 hover:text-primary-900 mr-3 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">No ended auctions found</h3>
              <p className="text-gray-500 mt-1">
                {endedProducts.length > 0 
                  ? "No auctions match your current filter criteria." 
                  : "There are no ended auctions in the system yet."}
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          {selectedProduct ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">{selectedProduct.title}</h2>
              
              <div className="aspect-w-16 aspect-h-9 mb-4">
                <img 
                  src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1495704907664-81f74a7efd9b?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw1fHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3'} 
                  alt={selectedProduct.title}
                  className="rounded-md object-cover w-full h-40" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Final Bid</p>
                  <p className="text-lg font-semibold">${selectedProduct.currentBid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="text-lg font-semibold">{selectedProduct.endsAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Bids</p>
                  <p className="text-lg font-semibold">{selectedProduct.bids.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedProduct.isWinnerDeclared 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedProduct.isWinnerDeclared ? 'Winner Declared' : 'Pending'}
                  </span>
                </div>
              </div>
              
              {selectedProduct.highestBidder ? (
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Award className="h-5 w-5 text-primary-600 mr-2" />
                    Highest Bidder
                  </h3>
                  
                  {detailsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading user details...</p>
                    </div>
                  ) : (
                    winnerDetails ? (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="font-medium text-gray-900">{winnerDetails.displayName}</p>
                        <p className="text-sm text-gray-600 mt-1">{winnerDetails.email}</p>
                        
                        {winnerDetails.phoneNumber && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Phone:</span> {winnerDetails.phoneNumber}
                          </p>
                        )}
                        
                        {winnerDetails.address && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Address:</span> {winnerDetails.address}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Winning Bid:</span> ${selectedProduct.highestBidder.amount.toLocaleString()}
                        </p>
                        
                        {!selectedProduct.isWinnerDeclared && (
                          <button
                            onClick={() => 
                              declareWinner(
                                selectedProduct.id, 
                                selectedProduct.highestBidder.userId,
                                selectedProduct.highestBidder.amount
                              )
                            }
                            className="mt-4 w-full btn btn-primary flex items-center justify-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Declare as Winner
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Unable to load user details</p>
                    )
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md text-center">
                  <p className="text-gray-500">No bids were placed on this item</p>
                </div>
              )}
              
              <Link 
                to={`/product/${selectedProduct.id}`}
                className="mt-4 w-full btn btn-outline flex items-center justify-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Product Page
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                <Award className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Select an Auction</h3>
              <p className="mt-1 text-gray-500">
                Select an ended auction to view details and declare winners
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 
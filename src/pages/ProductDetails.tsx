import  { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import BidForm from '../components/BidForm';
import BidHistory from '../components/BidHistory';
import PaymentBanner from '../components/PaymentBanner';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, Clock, Tag, Users, Calendar, DollarSign, Award, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { toDate, fromDate } from '../utils/firestoreConverters';

interface Product {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  currentBid: number;
  startingBid: number;
  startingDate: Date;
  endsAt: Date;
  category: string;
  isFixedPrice: boolean;
  scales?: number[];
  createdAt?: Date;
  winnerDeclared?: boolean;
  winnerId?: string;
  bids: any[];
  createdBy?: string;
  paid?: boolean;
}

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  address: string;
  isAdmin: boolean;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isWinner, setIsWinner] = useState(false);
  const [seller, setSeller] = useState<UserData | null>(null);
  const [winnerDetails, setWinnerDetails] = useState<UserData | null>(null);
  const [highestBidder, setHighestBidder] = useState<UserData | null>(null);
  const [declaringWinner, setDeclaringWinner] = useState(false);
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  
  // Premium luxury product images in case the product has no image
  const luxuryImages = [
    "https://images.unsplash.com/photo-1495704907664-81f74a7efd9b?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw1fHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1522255272218-7ac5249be344?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1541239370886-851049f91487?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwzfHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3"
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const data = productSnap.data();
          
          // Use safe timestamp conversion
          const startingDate = toDate(data.startingDate) || new Date();
          const endsAt = toDate(data.endsAt) || new Date();
          const createdAt = toDate(data.createdAt) || new Date();
          
          // Use one of our premium images if the product has no image
          const randomIndex = Math.floor(Math.random() * luxuryImages.length);
          
          const productData = {
            id: productSnap.id,
            ...data,
            startingDate,
            endsAt,
            createdAt,
            imageUrl: data.imageUrl || luxuryImages[randomIndex]
          } as Product;
          
          setProduct(productData);
          
          // Check if current user is the winner
          if (currentUser && productData.winnerDeclared && productData.winnerId === currentUser.uid) {
            setIsWinner(true);
          }

          // Get seller info if available
          if (productData.createdBy) {
            try {
              const sellerDoc = await getDoc(doc(db, 'users', productData.createdBy));
              if (sellerDoc.exists()) {
                setSeller(sellerDoc.data() as UserData);
              }
            } catch (error) {
              console.error('Error fetching seller data:', error);
            }
          }

          // Get winner info if declared
          if (productData.winnerDeclared && productData.winnerId) {
            try {
              const winnerDoc = await getDoc(doc(db, 'users', productData.winnerId));
              if (winnerDoc.exists()) {
                setWinnerDetails(winnerDoc.data() as UserData);
              }
            } catch (error) {
              console.error('Error fetching winner data:', error);
            }
          }

          // Find highest bidder
          if (productData.bids && productData.bids.length > 0) {
            // Sort bids by amount in descending order
            const sortedBids = [...productData.bids].sort((a, b) => b.amount - a.amount);
            const topBid = sortedBids[0];
            
            if (topBid && topBid.userId) {
              try {
                const bidderDoc = await getDoc(doc(db, 'users', topBid.userId));
                if (bidderDoc.exists()) {
                  setHighestBidder(bidderDoc.data() as UserData);
                }
              } catch (error) {
                console.error('Error fetching highest bidder data:', error);
              }
            }
          }
        } else {
          toast.error('Product not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate, currentUser]);

  useEffect(() => {
    if (!product) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      
      // Check if auction hasn't started yet
      if (product.startingDate > now) {
        const diff = product.startingDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `Starts in ${days}d ${hours}h ${minutes}m ${seconds}s`;
      }
      
      // Check if auction has ended
      if (product.endsAt < now) {
        return 'Auction ended';
      }
      
      // Auction is active, calculate time left
      const diff = product.endsAt.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [product]);

  const handleBidPlaced = (newBid: number) => {
    if (product) {
      setProduct({
        ...product,
        currentBid: newBid
      });
    }
  };

  const isAuctionActive = () => {
    if (!product) return false;
    
    const now = new Date();
    return product.startingDate <= now && product.endsAt > now;
  };

  const canPlaceBid = () => {
    return currentUser && isAuctionActive();
  };

  const canDeclareWinner = () => {
    // Check if user is admin and auction has ended and winner not declared yet
    if (!userData?.isAdmin || !product) return false;
    
    const now = new Date();
    return !product.winnerDeclared && product.endsAt < now && product.bids && product.bids.length > 0;
  };

  const declareWinner = async () => {
    if (!id || !highestBidder || !product) return;
    
    setDeclaringWinner(true);
    
    try {
      // Create properly formatted timestamp for notification
      const firestoreTimestamp = fromDate(new Date());
      
      // Update product with winner info
      await updateDoc(doc(db, 'products', id), {
        winnerDeclared: true,
        winnerId: highestBidder.uid,
        winnerName: highestBidder.displayName || 'Unknown Winner',
        winnerAmount: product.currentBid
      });
      
      // Add notification to winner
      await updateDoc(doc(db, 'users', highestBidder.uid), {
        notifications: arrayUnion({
          title: 'Auction Won!',
          message: `Congratulations! You've won the auction for ${product.title} with a bid of $${product.currentBid.toLocaleString()}`,
          type: 'bid_won',
          read: false,
          createdAt: firestoreTimestamp,
          productId: id
        })
      });
      
      // Update local state
      setProduct({
        ...product,
        winnerDeclared: true,
        winnerId: highestBidder.uid
      });
      
      setWinnerDetails(highestBidder);
      
      if (currentUser && highestBidder.uid === currentUser.uid) {
        setIsWinner(true);
      }
      
      toast.success('Winner declared successfully');
    } catch (error) {
      console.error('Error declaring winner:', error);
      toast.error('Failed to declare winner');
    } finally {
      setDeclaringWinner(false);
    }
  };

  const handlePaymentClick = () => {
    if (product && product.id) {
      navigate(`/payment/${product.id}`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary inline-flex items-center"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-gray-600 hover:text-primary-600"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-72 md:h-full object-cover"
            />
          </div>
          
          <div className="md:w-1/2 p-6 md:p-8">
            <div className="flex items-center">
              <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                {product.category || 'Uncategorized'}
              </span>
              <div className="ml-auto flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                <span>{product.bids?.length || 0} bids</span>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mt-4">{product.title}</h1>
            
            {seller && (
              <div className="mt-2 text-sm text-gray-600">
                Listed by: <span className="font-medium">{seller.displayName}</span>
              </div>
            )}
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Current Bid</p>
                <p className="text-3xl font-bold text-primary-600">
                  ${product.currentBid.toLocaleString()}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500 flex items-center justify-end">
                  <Clock className="h-4 w-4 mr-1" />
                  Time Left
                </p>
                <p className={`text-lg font-bold ${
                  timeLeft === 'Auction ended' ? 'text-red-600' : 
                  timeLeft.startsWith('Starts in') ? 'text-yellow-600' : 'text-gray-800'
                }`}>
                  {timeLeft}
                </p>
              </div>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Starts: {product.startingDate.toLocaleString()}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>Ends: {product.endsAt.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium">Description</h3>
              <p className="mt-2 text-gray-600">{product.description}</p>
            </div>
            
            {product.isFixedPrice && product.scales && product.scales.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium">Price Scales</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {product.scales.map((scale, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded-md">
                      <p className="text-sm text-gray-600">Scale {index + 1}</p>
                      <p className="font-medium">${scale.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Winner Section */}
            {product.winnerDeclared && (
              <div className="mt-6 bg-green-50 p-4 rounded-md">
                <div className="flex items-start">
                  <Award className="h-5 w-5 text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-green-700 font-medium">This auction has ended</p>
                    {winnerDetails && (
                      <p className="text-green-700 mt-1">
                        Winner: <span className="font-semibold">{winnerDetails.displayName}</span> with a bid of ${product.currentBid.toLocaleString()}
                      </p>
                    )}
                    
                    {isWinner && !product.paid && (
                      <button
                        onClick={handlePaymentClick}
                        className="mt-3 btn btn-primary flex items-center"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Complete Payment (${product.currentBid.toLocaleString()})
                      </button>
                    )}
                    
                    {isWinner && product.paid && (
                      <div className="mt-3 flex items-center text-green-700">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Payment completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Admin Winner Declaration */}
            {canDeclareWinner() && highestBidder && (
              <div className="mt-6 bg-yellow-50 p-4 rounded-md">
                <div className="flex items-start">
                  <Award className="h-5 w-5 text-yellow-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-700 font-medium">This auction has ended</p>
                    <p className="text-yellow-700 mt-1">
                      Highest bidder: <span className="font-semibold">{highestBidder.displayName}</span> with a bid of ${product.currentBid.toLocaleString()}
                    </p>
                    <button
                      onClick={declareWinner}
                      disabled={declaringWinner}
                      className="mt-3 btn btn-primary"
                    >
                      {declaringWinner ? 'Declaring...' : 'Declare as Winner'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Active Bidding Section */}
            {!isWinner && !product.winnerDeclared && (
              <>
                {isAuctionActive() ? (
                  canPlaceBid() ? (
                    <BidForm 
                      productId={id || ''} 
                      currentBid={product.currentBid} 
                      onBidPlaced={handleBidPlaced} 
                    />
                  ) : (
                    <div className="mt-6 bg-gray-50 p-4 rounded-md">
                      <p className="text-center text-gray-600">
                        You need to{' '}
                        <button
                          onClick={() => navigate('/login')}
                          className="text-primary-600 font-medium hover:underline"
                        >
                          log in
                        </button>{' '}
                        to place a bid
                      </p>
                    </div>
                  )
                ) : timeLeft.startsWith('Starts in') ? (
                  <div className="mt-6 bg-yellow-50 p-4 rounded-md">
                    <p className="text-center text-yellow-700 font-medium">
                      Bidding will start soon. Check back when the auction begins.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 bg-red-50 p-4 rounded-md">
                    <p className="text-center text-red-600 font-medium">
                      This auction has ended
                    </p>
                    {highestBidder && (
                      <p className="text-center text-red-600 mt-1">
                        Highest bidder: <span className="font-semibold">{highestBidder.displayName}</span> with ${product.currentBid.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Payment info */}
            {isWinner && !product.paid && <PaymentBanner />}
            
            <BidHistory productId={id || ''} showDetailedUserInfo={userData?.isAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
}
 
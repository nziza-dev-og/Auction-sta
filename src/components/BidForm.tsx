import  { useState } from 'react';
import { doc, updateDoc, arrayUnion, collection, addDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { fromDate } from '../utils/firestoreConverters';

interface BidFormProps {
  productId: string;
  currentBid: number;
  onBidPlaced: (newBid: number) => void;
}

export default function BidForm({ productId, currentBid, onBidPlaced }: BidFormProps) {
  const [bidAmount, setBidAmount] = useState<string>((currentBid + 10).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser, userData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userData) {
      toast.error('You must be logged in to place a bid');
      return;
    }
    
    const bidValue = parseFloat(bidAmount);
    
    if (isNaN(bidValue) || bidValue <= currentBid) {
      toast.error(`Bid must be higher than the current bid of $${currentBid}`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a timestamp that works with Firestore
      const firestoreTimestamp = fromDate(new Date());
      
      // Add bid to product document with valid timestamp
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        currentBid: bidValue,
        bids: arrayUnion({
          userId: currentUser.uid,
          userName: userData.displayName || 'Anonymous User',
          amount: bidValue,
          timestamp: firestoreTimestamp
        })
      });
      
      // Add to user's bids collection
      await addDoc(collection(db, 'users', currentUser.uid, 'bids'), {
        productId,
        amount: bidValue,
        timestamp: firestoreTimestamp
      });

      // Send notification to other bidders
      try {
        // Get the product to get bidder info
        const productSnapshot = await getDoc(productRef);
        
        if (productSnapshot.exists()) {
          const productData = productSnapshot.data();
          const bidders = new Set();
          
          // Collect unique bidder IDs excluding current user
          if (productData.bids && Array.isArray(productData.bids)) {
            productData.bids.forEach(bid => {
              if (bid.userId && bid.userId !== currentUser.uid) {
                bidders.add(bid.userId);
              }
            });
          }
          
          // Send notifications to each bidder
          for (const bidderId of bidders) {
            await updateDoc(doc(db, 'users', bidderId), {
              notifications: arrayUnion({
                title: 'You have been outbid!',
                message: `A new bid of $${bidValue.toLocaleString()} has been placed on ${productData.title}`,
                type: 'outbid',
                read: false,
                createdAt: firestoreTimestamp,
                productId
              })
            });
          }
        }
      } catch (error) {
        console.error('Error sending outbid notifications:', error);
        // Continue execution even if notifications fail
      }
      
      toast.success('Bid placed successfully!');
      onBidPlaced(bidValue);
      setBidAmount((bidValue + 10).toString());
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-4">
        <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Your Bid
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">$</span>
          </div>
          <input
            type="number"
            id="bidAmount"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="input pl-7"
            step="0.01"
            min={currentBid + 0.01}
            required
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Minimum bid: ${(currentBid + 0.01).toFixed(2)}
        </p>
      </div>
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
      </button>
    </form>
  );
}
 
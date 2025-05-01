import  { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCheckoutSession } from '../services/stripeService';
import { fromDate } from '../utils/firestoreConverters';

interface PaymentComponentProps {
  productId: string;
  productTitle: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentComponent({
  productId,
  productTitle,
  amount,
  onSuccess,
  onCancel
}: PaymentComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handlePayWithStripe = async () => {
    if (!productId || !currentUser) {
      setError('Login required to complete payment');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Update product with pending payment status
      await updateDoc(doc(db, 'products', productId), {
        paymentStatus: 'pending',
        paymentInitiated: fromDate(new Date())
      });

      // Add notification about payment initiation
      await updateDoc(doc(db, 'users', currentUser.uid), {
        notifications: arrayUnion({
          title: 'Payment Initiated',
          message: `You've started the payment process for ${productTitle}`,
          type: 'payment',
          read: false,
          createdAt: fromDate(new Date()),
          productId
        })
      });

      // Generate success and cancel URLs
      const successUrl = `${window.location.origin}/payment/success/${productId}`;
      const cancelUrl = `${window.location.origin}/product/${productId}?payment_canceled=true`;

      // Create and redirect to Stripe checkout
      await createCheckoutSession(
        productId,
        productTitle,
        amount,
        currentUser.uid,
        successUrl,
        cancelUrl
      );

      // Note: User will be redirected to Stripe by createCheckoutSession
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment processing failed. Please try again.');
      setError('Payment processing failed. Please check your details and try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Complete Your Purchase</h2>
        <div className="flex items-center text-sm text-gray-600">
          <Shield className="h-4 w-4 mr-1 text-green-500" />
          <span>Secure Payment</span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">{productTitle}</h3>
            <p className="text-sm text-gray-600">Auction Winner Payment</p>
          </div>
          <p className="text-xl font-bold">${amount.toLocaleString()}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button
          onClick={handlePayWithStripe}
          disabled={isProcessing}
          className="btn btn-primary flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Pay with Card (${amount.toLocaleString()})
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="btn btn-outline"
        >
          Cancel
        </button>
      </div>

      <div className="border-t pt-4 mt-4">
        <p className="text-sm text-center text-gray-500 mb-2">Secure payment processing by Stripe</p>
        <div className="flex justify-center">
          <img 
            src="https://images.unsplash.com/photo-1556740714-a8395b3bf30f?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxjcmVkaXQlMjBjYXJkJTIwcGF5bWVudCUyMHNlY3VyZSUyMHN0cmlwZSUyMGNoZWNrb3V0fGVufDB8fHx8MTc0NjA5OTU2Mnww&ixlib=rb-4.0.3" 
            alt="Secure Payment"
            className="h-8 object-contain rounded mx-1"
          />
        </div>
      </div>
    </div>
  );
}
 
import  { useState, useEffect } from 'react';
import { CreditCard, Mail, Lock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPaymentIntent, confirmPayment } from '../services/stripe';

interface StripePaymentFormProps {
  amount: number;
  productId: string;
  productTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({ 
  amount, 
  productId, 
  productTitle, 
  onSuccess, 
  onCancel 
}: StripePaymentFormProps) {
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2)}`;
    }
    
    return value;
  };

  const validateForm = () => {
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Please enter a valid 16-digit card number');
      return false;
    }
    
    if (!cardHolder) {
      toast.error('Please enter the name on card');
      return false;
    }
    
    if (!expiry.includes('/') || expiry.length !== 5) {
      toast.error('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    
    if (cvc.length < 3) {
      toast.error('Please enter a valid CVC');
      return false;
    }
    
    return true;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setProcessing(true);
    setPaymentStatus('processing');
    
    try {
      // Create a payment intent using our Stripe service
      const paymentIntent = await createPaymentIntent(
        amount,
        'usd',
        `Payment for auction item: ${productTitle}`,
        {
          productId,
          productTitle
        }
      );
      
      // For a real implementation, we would use Stripe.js to collect and tokenize card details
      // Here we're simulating the payment confirmation
      const paymentConfirmation = await confirmPayment(
        paymentIntent.id,
        'pm_card_visa' // This is a test payment method ID from Stripe
      );
      
      if (paymentConfirmation.status === 'succeeded') {
        setPaymentStatus('success');
        toast.success('Payment successful!');
        
        // Update database with payment status
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Secure Checkout</h2>
        <div className="flex items-center text-sm text-gray-600">
          <Shield className="h-4 w-4 mr-1 text-green-500" />
          <span>Stripe Secure</span>
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
      
      {paymentStatus === 'success' ? (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-6">Your payment has been processed successfully.</p>
          <p className="text-gray-600 mb-1">A confirmation email has been sent to:</p>
          <p className="font-medium">{email}</p>
        </div>
      ) : (
        <form onSubmit={handlePayment}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                className="input pl-10"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="cardNumber"
                type="text"
                className="input pl-10"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <img 
                  src="https://images.unsplash.com/photo-1599050751795-6cdaafbc2319?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwzfHxjcmVkaXQlMjBjYXJkJTIwcGF5bWVudCUyMHNlY3VyZSUyMHN0cmlwZSUyMGNoZWNrb3V0fGVufDB8fHx8MTc0NjA5OTU2Mnww&ixlib=rb-4.0.3" 
                  alt="Credit Card"
                  className="h-5 w-8 object-cover rounded"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="cardHolder" className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
            <input
              id="cardHolder"
              type="text"
              className="input"
              placeholder="John Doe"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                id="expiry"
                type="text"
                className="input"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => {
                  const value = e.target.value.replace('/', '');
                  if (value.length <= 4) {
                    setExpiry(formatExpiryDate(value));
                  }
                }}
                maxLength={5}
                required
              />
            </div>
            <div>
              <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
              <div className="relative">
                <input
                  id="cvc"
                  type="text"
                  className="input pr-10"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 4) {
                      setCvc(value);
                    }
                  }}
                  maxLength={4}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary flex items-center" 
              disabled={processing}
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>Pay ${amount.toLocaleString()}</>
              )}
            </button>
          </div>
        </form>
      )}
      
      <div className="mt-6 border-t pt-6">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center">
            <Lock className="h-4 w-4 text-gray-500 mr-1" />
            <span className="text-xs text-gray-500">Secure Payment</span>
          </div>
          <span className="mx-2 text-gray-300">•</span>
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-gray-500 mr-1" />
            <span className="text-xs text-gray-500">Encrypted Data</span>
          </div>
        </div>
        <div className="flex justify-center space-x-4">
          <img 
            src="https://images.unsplash.com/photo-1556740714-a8395b3bf30f?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxjcmVkaXQlMjBjYXJkJTIwcGF5bWVudCUyMHNlY3VyZSUyMHN0cmlwZSUyMGNoZWNrb3V0fGVufDB8fHx8MTc0NjA5OTU2Mnww&ixlib=rb-4.0.3" 
            alt="Secure Payment"
            className="h-8 w-auto object-contain rounded-md"
          />
          <img 
            src="https://images.unsplash.com/photo-1509017174183-0b7e0278f1ec?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxjcmVkaXQlMjBjYXJkJTIwcGF5bWVudCUyMHNlY3VyZSUyMHN0cmlwZSUyMGNoZWNrb3V0fGVufDB8fHx8MTc0NjA5OTU2Mnww&ixlib=rb-4.0.3" 
            alt="Mobile Payment"
            className="h-8 w-auto object-contain rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
 
import  { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CreditCard, Shield, CheckCircle } from 'lucide-react';
import PaymentComponent from '../components/PaymentComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import { toDate } from '../utils/firestoreConverters';

export default function PaymentPage() {
  const { productId } = useParams<{ productId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId || !currentUser) {
        setError('You must be logged in to access this page');
        setLoading(false);
        return;
      }
      
      try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        
        if (!productDoc.exists()) {
          setError('Product not found');
          setLoading(false);
          return;
        }
        
        const productData = {
          id: productDoc.id,
          ...productDoc.data(),
          endsAt: toDate(productDoc.data().endsAt),
          startingDate: toDate(productDoc.data().startingDate)
        };
        
        // Check if user is winner
        if (!productData.winnerDeclared) {
          setError('This auction has not been declared yet');
        } else if (productData.winnerId !== currentUser.uid) {
          setError('You are not the winner of this auction');
        } else if (productData.paid) {
          setError('This auction has already been paid for');
        }
        
        setProduct(productData);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [productId, currentUser]);

  const handlePaymentSuccess = () => {
    navigate(`/payment/success/${productId}`);
  };

  const handleCancel = () => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to={`/product/${productId}`} className="flex items-center text-gray-600 mb-6">
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Product
      </Link>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Complete Your Purchase</h1>
        <p className="text-gray-600">
          You are about to pay for <span className="font-medium">{product.title}</span>
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <img 
            src={product.imageUrl} 
            alt={product.title} 
            className="w-20 h-20 object-cover rounded-md mr-4" 
          />
          <div>
            <h2 className="font-semibold text-lg">{product.title}</h2>
            <p className="text-gray-600 text-sm">Winning bid amount: <span className="font-medium">${product.currentBid.toLocaleString()}</span></p>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span>${product.currentBid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Service Fee</span>
            <span>$0.00</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span>${product.currentBid.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <PaymentComponent 
        productId={product.id}
        productTitle={product.title}
        amount={product.currentBid}
        onSuccess={handlePaymentSuccess}
        onCancel={handleCancel}
      />
      
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-600" />
          Secure Payment Guarantee
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600 mt-0.5" />
            <p>Your payment information is protected with industry-standard encryption</p>
          </div>
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600 mt-0.5" />
            <p>We do not store your credit card details</p>
          </div>
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600 mt-0.5" />
            <p>Payments are securely processed through Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
 
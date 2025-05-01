import  { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CheckCircle, Home, Package, ShoppingBag } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PaymentSuccess() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      
      try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        
        if (productDoc.exists()) {
          setProduct({
            id: productDoc.id,
            ...productDoc.data()
          });
          
          // Generate a random order number for the demo
          const orderNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
          setOrderNumber(orderNum);
          
          // Update product as paid
          await updateDoc(doc(db, 'products', productId), {
            paid: true,
            paidAt: new Date(),
            orderNumber: orderNum,
            paymentMethod: 'stripe'
          });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [productId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Link to="/" className="btn btn-primary">Go to Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your transaction has been completed successfully.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-500 mb-1">Order Number</p>
          <p className="font-semibold">{orderNumber}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-500 mb-1">Item Purchased</p>
          <p className="font-semibold">{product.title}</p>
          <p className="text-sm text-gray-700 mt-2">Amount: ${product.currentBid?.toLocaleString()}</p>
          <p className="text-sm text-gray-700 mt-1">Payment Method: Stripe</p>
        </div>
        
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link to="/dashboard" className="btn btn-primary flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 mr-2" />
            My Purchases
          </Link>
          <Link to="/" className="btn btn-outline flex items-center justify-center">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <img 
            src="https://images.unsplash.com/photo-1637021536331-17abe5429592?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw1fHxjcmVkaXQlMjBjYXJkJTIwcGF5bWVudCUyMHNlY3VyZSUyMHN0cmlwZSUyMGNoZWNrb3V0fGVufDB8fHx8MTc0NjA5OTU2Mnww&ixlib=rb-4.0.3" 
            alt="Secure Payment Completed"
            className="h-24 w-auto object-contain mx-auto rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
 
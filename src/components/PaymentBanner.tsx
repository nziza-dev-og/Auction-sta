import  { CreditCard, Shield, Lock } from 'lucide-react';

export default function PaymentBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 px-6 rounded-lg shadow-md my-6">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0">
          <h3 className="text-lg font-semibold mb-1">Secure Payment Processing</h3>
          <p className="text-sm opacity-90">All payments are secured through Stripe's industry-leading payment gateway</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-white/20 rounded-full p-2 mb-1 mx-auto w-10 h-10 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-xs">Credit Cards</span>
          </div>
          
          <div className="text-center">
            <div className="bg-white/20 rounded-full p-2 mb-1 mx-auto w-10 h-10 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xs">Secure</span>
          </div>
          
          <div className="text-center">
            <div className="bg-white/20 rounded-full p-2 mb-1 mx-auto w-10 h-10 flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <span className="text-xs">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
 
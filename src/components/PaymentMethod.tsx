import  { useState } from 'react';
import { DollarSign, CreditCard, AlertCircle } from 'lucide-react';

interface PaymentMethodProps {
  selectedMethod: 'stripe' | 'paypal' | 'bank';
  onSelect: (method: 'stripe' | 'paypal' | 'bank') => void;
}

export default function PaymentMethod({ selectedMethod, onSelect }: PaymentMethodProps) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">Payment Method</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className={`border rounded-lg p-4 flex items-center cursor-pointer transition-colors ${
            selectedMethod === 'stripe'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelect('stripe')}
        >
          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
            <CreditCard className={`h-5 w-5 ${selectedMethod === 'stripe' ? 'text-primary-600' : 'text-gray-500'}`} />
          </div>
          <div className="ml-3">
            <p className="font-medium">Credit Card</p>
            <p className="text-xs text-gray-500">Visa, Mastercard, Amex</p>
          </div>
          {selectedMethod === 'stripe' && (
            <div className="ml-auto w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        <div
          className={`border rounded-lg p-4 flex items-center cursor-pointer transition-colors ${
            selectedMethod === 'paypal'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelect('paypal')}
        >
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold">P</span>
          </div>
          <div className="ml-3">
            <p className="font-medium">PayPal</p>
            <p className="text-xs text-gray-500">Fast & secure</p>
          </div>
          {selectedMethod === 'paypal' && (
            <div className="ml-auto w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        <div
          className={`border rounded-lg p-4 flex items-center cursor-pointer transition-colors ${
            selectedMethod === 'bank'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelect('bank')}
        >
          <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className={`h-5 w-5 ${selectedMethod === 'bank' ? 'text-green-600' : 'text-gray-500'}`} />
          </div>
          <div className="ml-3">
            <p className="font-medium">Bank Transfer</p>
            <p className="text-xs text-gray-500">Direct deposit</p>
          </div>
          {selectedMethod === 'bank' && (
            <div className="ml-auto w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {selectedMethod !== 'stripe' && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
            Sorry, only credit card payments via Stripe are available in this demo. Please select the Credit Card option.
          </p>
        </div>
      )}
    </div>
  );
}
 
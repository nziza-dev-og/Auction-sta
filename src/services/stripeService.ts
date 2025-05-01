import  { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with public key
export const stripePromise = loadStripe('pk_test_51RGgLKB2p9rTQVgBY8t2jBOUn1u7XUX8iSe44OhYZZztcFcMM7n4xb3rIEuas95bEaX5MRwFmhoHtsSMOQKr5F3D00TZ2HCXyW');

// Create a checkout session for an auction payment
export const createCheckoutSession = async (
  productId: string,
  productTitle: string,
  amount: number,
  userId: string,
  successUrl: string,
  cancelUrl: string
) => {
  try {
    // Prepare checkout session data
    const sessionData = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: productTitle,
            description: `Payment for auction item: ${productTitle}`,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productId,
        userId,
      },
    };

    // Send request through our proxy to create a Stripe checkout session
    const response = await fetch('https://hooks.jdoodle.net/proxy?url=https://stripe-server-0o46.onrender.com/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    
    // Load Stripe.js
    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }
    
    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { success: false, error };
  }
};

// Verify payment status
export const verifyPayment = async (sessionId: string) => {
  try {
    const response = await fetch(`https://hooks.jdoodle.net/proxy?url=https://stripe-server-0o46.onrender.com/verify-payment?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment');
    }

    const data = await response.json();
    return {
      success: true,
      paymentStatus: data.payment_status,
      sessionData: data
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error };
  }
};
 
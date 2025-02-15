import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Send, ArrowRight, History, RefreshCw, Plus, CreditCard, Building2, Wallet2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create a new component for the payment form
const PaymentForm = ({ amount, onSuccess, onCancel, isProcessing, setIsProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setIsProcessing(true);

    try {
      // Update the endpoint to match backend route
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: amount,
          fromCurrency: 'USD', // Using USD as default
          toCurrency: 'USD'    // Using USD as default
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        // Verify payment status
        const verifyResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/payment/verify-payment/${result.paymentIntent.id}`
        );
        const verifyResult = await verifyResponse.json();
        
        if (verifyResult.status === 'succeeded') {
          onSuccess();
        } else {
          setError('Payment verification failed');
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-white">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <div className="flex gap-2">
        <Button 
          type="button"
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={!stripe || isProcessing || !amount}
          className={`flex-1 ${
            isProcessing 
              ? 'bg-gray-400' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin">⚪</span>
              Processing...
            </div>
          ) : (
            'Pay'
          )}
        </Button>
      </div>
    </form>
  );
};

export const WalletComponent = () => {
  const [balance, setBalance] = useState(1000);
  const [amount, setAmount] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [notification, setNotification] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState(0.85); // Example rate
  const [recentTransactions, setRecentTransactions] = useState([
    {
      id: 1,
      type: 'send',
      amount: 100,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      recipient: 'John Doe',
      date: '2024-02-20',
      status: 'completed'
    },
    {
      id: 2,
      type: 'send',
      amount: 50,
      fromCurrency: 'USD',
      toCurrency: 'GBP',
      recipient: 'Jane Smith',
      date: '2024-02-19',
      status: 'completed'
    }
  ]);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

  const handleSendMoney = () => {
    if (amount && !isNaN(amount) && Number(amount) > 0 && recipient) {
      if (Number(amount) <= balance) {
        const convertedAmount = Number(amount) * exchangeRate;
        setBalance(prev => prev - Number(amount));
        
        // Add to recent transactions
        const newTransaction = {
          id: Date.now(),
          type: 'send',
          amount: Number(amount),
          fromCurrency,
          toCurrency,
          recipient,
          date: new Date().toISOString().split('T')[0],
          status: 'completed'
        };
        
        setRecentTransactions(prev => [newTransaction, ...prev]);
        setNotification(`Successfully sent ${amount} ${fromCurrency} (${convertedAmount.toFixed(2)} ${toCurrency}) to ${recipient}`);
        setAmount('');
        setRecipient('');
        setShowSend(false);
        setTimeout(() => setNotification(''), 3000);
      } else {
        setNotification('Insufficient balance');
        setTimeout(() => setNotification(''), 3000);
      }
    }
  };

  const handleAddMoney = async () => {
    if (paymentMethod === 'card') {
      // Payment will be handled by Stripe
      return;
    }
    if (addAmount && !isNaN(addAmount) && Number(addAmount) > 0) {
      setBalance(prev => prev + Number(addAmount));
      
      // Add to recent transactions
      const newTransaction = {
        id: Date.now(),
        type: 'deposit',
        amount: Number(addAmount),
        fromCurrency,
        toCurrency: fromCurrency,
        recipient: 'Wallet',
        date: new Date().toISOString().split('T')[0],
        status: 'completed'
      };
      
      setRecentTransactions(prev => [newTransaction, ...prev]);
      setNotification(`Successfully added ${formatCurrency(Number(addAmount), fromCurrency)} to your wallet`);
      setAddAmount('');
      setShowAddMoney(false);
      setPaymentMethod('');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'bank', name: 'Bank Transfer', icon: <Building2 className="w-5 h-5" /> },
    { id: 'upi', name: 'UPI', icon: <Wallet2 className="w-5 h-5" /> },
  ];

  const handlePaymentSuccess = () => {
    try {
      setBalance(prev => prev + Number(addAmount));
      
      const newTransaction = {
        id: Date.now(),
        type: 'deposit',
        amount: Number(addAmount),
        fromCurrency,
        toCurrency: fromCurrency,
        recipient: 'Wallet',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        method: 'card'
      };
      
      setRecentTransactions(prev => [newTransaction, ...prev]);
      setNotification(`Successfully added ${formatCurrency(Number(addAmount), fromCurrency)} to your wallet`);
      
      // Reset states
      setAddAmount('');
      setShowAddMoney(false);
      setPaymentMethod('');
      setPaymentError(null);
      setIsProcessing(false);
      
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      console.error('Success handler error:', error);
      setPaymentError('Error updating wallet. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Wallet className="h-6 w-6 text-blue-500" />
              Your Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">Available Balance</p>
              <h2 className="text-4xl font-bold my-2 text-gray-900">
                {formatCurrency(balance, fromCurrency)}
              </h2>
            </div>

            <div className="space-y-4">
              <Button 
                variant="secondary" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowAddMoney(!showAddMoney)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Money
              </Button>

              {showAddMoney && (
                <div className="space-y-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Money to Wallet</h3>
                  <div className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />

                    {paymentMethod === 'card' && addAmount ? (
                      <div className="space-y-4">
                        {paymentError && (
                          <Alert variant="destructive">
                            <AlertDescription>{paymentError}</AlertDescription>
                          </Alert>
                        )}
                        
                        <Elements stripe={stripePromise}>
                          <PaymentForm 
                            amount={Number(addAmount)}
                            onSuccess={handlePaymentSuccess}
                            onCancel={() => {
                              setPaymentMethod('');
                              setPaymentError(null);
                            }}
                            isProcessing={isProcessing}
                            setIsProcessing={setIsProcessing}
                          />
                        </Elements>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm text-gray-600">Select Payment Method</label>
                        <div className="grid grid-cols-1 gap-2">
                          {paymentMethods.map((method) => (
                            <button
                              key={method.id}
                              onClick={() => setPaymentMethod(method.id)}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                                paymentMethod === method.id 
                                  ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                                  : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div className="text-blue-500">{method.icon}</div>
                              <span>{method.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                variant="secondary" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowSend(!showSend)}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Money at Great Rates
              </Button>

              {showSend && (
                <div className="space-y-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <Input
                    placeholder="Recipient name or email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <select 
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 p-2 rounded"
                    >
                      {currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Exchange Rate:</span>
                    <div className="flex items-center gap-1">
                      <span>1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
                      <RefreshCw className="w-3 h-3 cursor-pointer text-blue-500" />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleSendMoney}
                  >
                    Send Money
                  </Button>
                </div>
              )}
            </div>

            {notification && (
              <Alert className="mt-4 bg-blue-50 border-blue-200 text-blue-700">
                <AlertDescription>
                  {notification}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <History className="w-4 h-4" />
                  <span className="text-sm">Recent Transactions</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.recipient}</p>
                        <p className="text-xs text-gray-600">{transaction.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.amount, transaction.fromCurrency)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(transaction.amount * exchangeRate, transaction.toCurrency)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletComponent;
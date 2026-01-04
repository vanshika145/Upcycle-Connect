import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialRequest, requestAPI } from "@/lib/api";
import { toast } from "sonner";

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  request: MaterialRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (paymentId: string) => Promise<void>;
}

export const PaymentModal = ({ request, isOpen, onClose, onPaymentComplete }: PaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [fetchedAmount, setFetchedAmount] = useState<number | null>(null); // Amount in paise
  const [amountLoading, setAmountLoading] = useState(false);

  // Load Razorpay checkout script
  useEffect(() => {
    if (isOpen && !razorpayLoaded) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setRazorpayLoaded(true);
      };
      script.onerror = () => {
        toast.error('Failed to load Razorpay checkout');
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup script on unmount
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, [isOpen, razorpayLoaded]);

  // Fetch payment amount from backend when modal opens
  useEffect(() => {
    const fetchAmount = async () => {
      if (isOpen && request) {
        setAmountLoading(true);
        try {
          const orderResponse = await requestAPI.createPaymentOrder(request.id);
          setFetchedAmount(orderResponse.order.amount); // amount in paise
        } catch (error: any) {
          setFetchedAmount(null);
          // Only show error if not already paid or not approved
          if (error?.message && !error.message.includes('Payment already completed')) {
            toast.error(error.message || 'Failed to fetch payment amount');
          }
        } finally {
          setAmountLoading(false);
        }
      } else {
        setFetchedAmount(null);
      }
    };
    fetchAmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, request]);

  const handlePayment = async () => {
    if (!request) return;

    try {
      setLoading(true);

      // Create Razorpay order on backend
      const orderResponse = await requestAPI.createPaymentOrder(request.id);
      const { order, keyId } = orderResponse;

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        toast.error('Payment gateway not loaded. Please try again.');
        setLoading(false);
        return;
      }

      // Initialize Razorpay checkout
      const options = {
        key: keyId,
        amount: order.amount, // Amount in paise
        currency: order.currency,
        name: 'UpCycle Connect',
        description: `Payment for ${request.material.title}`,
        order_id: order.id,
        receipt: order.receipt,
        handler: async function (response: any) {
          try {
            // Verify payment on backend
            await requestAPI.verifyPayment(
              request.id,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            // Call the onPaymentComplete callback
            await onPaymentComplete(response.razorpay_payment_id);
            
            setSuccess(true);
            toast.success('Payment successful!');

            // Close modal after 2 seconds
            setTimeout(() => {
              setSuccess(false);
              onClose();
            }, 2000);
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Payment verification failed');
            setLoading(false);
          }
        },
        prefill: {
          name: request.seeker?.name || '',
          email: request.seeker?.email || '',
        },
        theme: {
          color: '#10b981', // Green color matching the app theme
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card rounded-2xl p-6 w-full max-w-md relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {success ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="font-display font-bold text-xl mb-2">Payment Successful!</h3>
                  <p className="text-muted-foreground">Your payment has been processed.</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-xl">Complete Payment</h2>
                        <p className="text-sm text-muted-foreground">{request.material.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Material:</span>
                      <span className="font-medium">{request.material.title}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Quantity Requested:</span>
                      <span className="font-medium">{request.quantity}</span>
                    </div>
                    {(() => {
                      // Use fetched amount from backend (in paise) if available, otherwise calculate locally
                      let totalInRupees = 0;
                      let isLoadingAmount = amountLoading;
                      
                      if (fetchedAmount !== null && fetchedAmount !== undefined) {
                        // Convert from paise to rupees
                        totalInRupees = fetchedAmount / 100;
                        // If backend returns minimal amount (1 paise = ₹0.01) for free materials, treat as free
                        if (totalInRupees < 0.01) {
                          totalInRupees = 0;
                        }
                      } else {
                        // Fallback: Calculate total based on price and quantity from request data
                        // Price is stored in rupees (not paise) in the database
                        const materialPrice = request.material?.price ?? 0;
                        const priceUnit = request.material?.priceUnit || 'total';
                        const quantityStr = request.quantity || '1';
                        const quantityMatch = quantityStr.match(/(\d+(?:\.\d+)?)/);
                        const requestedQty = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
                        
                        // Ensure materialPrice is a valid number
                        const validPrice = typeof materialPrice === 'number' && !isNaN(materialPrice) && materialPrice >= 0 
                          ? materialPrice 
                          : 0;
                        
                        if (priceUnit === 'total') {
                          totalInRupees = validPrice;
                        } else {
                          totalInRupees = validPrice * requestedQty;
                        }
                        
                        // Ensure total is a valid number
                        if (isNaN(totalInRupees) || totalInRupees < 0) {
                          totalInRupees = 0;
                        }
                      }
                      
                      const materialPrice = request.material?.price ?? 0;
                      const priceUnit = request.material?.priceUnit || 'total';
                      const validPrice = typeof materialPrice === 'number' && !isNaN(materialPrice) && materialPrice >= 0 
                        ? materialPrice 
                        : 0;
                      
                      return (
                        <>
                          {validPrice > 0 && (
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Unit Price:</span>
                              <span className="font-medium">
                                ₹{validPrice.toFixed(2)}
                                {priceUnit !== 'total' && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    /{priceUnit === 'per_unit' ? 'unit' :
                                      priceUnit === 'per_kg' ? 'kg' :
                                      priceUnit === 'per_box' ? 'box' :
                                      priceUnit === 'per_set' ? 'set' : ''}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-border mt-3 pt-3">
                            <div className="flex justify-between">
                              <span className="font-semibold">Total Amount:</span>
                              <span className="font-display font-bold text-lg text-primary">
                                {isLoadingAmount ? (
                                  <span className="text-muted-foreground">Loading...</span>
                                ) : totalInRupees > 0 ? (
                                  `₹${totalInRupees.toFixed(2)}`
                                ) : (
                                  'Free'
                                )}
                              </span>
                            </div>
                            {!isLoadingAmount && totalInRupees === 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                This material is available for free
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Payment Info */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Secure Payment:</strong> Your payment will be processed securely through Razorpay. 
                      You'll be redirected to the payment gateway.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="hero"
                      onClick={handlePayment}
                      disabled={loading || !razorpayLoaded}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay with Razorpay
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

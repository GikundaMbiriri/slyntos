import React, { useState, useEffect } from "react";
import {
  stripeService,
  STRIPE_PRODUCTS,
  PaymentConfig,
} from "../services/stripeService";
import { UserPlan } from "../types";
import Loader from "./Loader";
import LockIcon from "./icons/LockIcon";
import CheckIcon from "./icons/CheckIcon";

interface StripeCheckoutProps {
  plan: UserPlan;
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess: (plan: UserPlan, endDate: number) => void;
  onError: (error: string) => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  plan,
  userId,
  userEmail,
  userName,
  onSuccess,
  onError,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "ready" | "processing" | "redirecting"
  >("ready");

  // Check for payment success on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentResult = stripeService.handlePaymentSuccess(urlParams);

    if (paymentResult && paymentResult.success) {
      onSuccess(paymentResult.plan, paymentResult.endDate);
    }
  }, [onSuccess]);

  const handlePayment = async () => {
    if (plan === "free") {
      onSuccess(plan, 0);
      return;
    }

    setIsProcessing(true);
    setPaymentStep("processing");

    try {
      // Check if we have required env variables
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error(
          "Stripe is not configured. Please check environment variables.",
        );
      }

      // Initialize Stripe with better error handling
      await stripeService.initialize();

      const paymentConfig: PaymentConfig = {
        plan,
        userId,
        userEmail,
        userName,
      };

      // Create checkout session
      const { sessionId } =
        await stripeService.createCheckoutSession(paymentConfig);

      setPaymentStep("redirecting");

      // Redirect to Stripe checkout
      await stripeService.redirectToCheckout(sessionId);
    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = "Payment processing failed";

      if (error instanceof Error) {
        if (error.message.includes("Failed to load Stripe.js")) {
          errorMessage =
            "Unable to load payment processor. Please refresh the page and try again.";
        } else if (error.message.includes("not configured")) {
          errorMessage =
            "Payment system not configured. Please contact support.";
        } else {
          errorMessage = error.message;
        }
      }

      onError(errorMessage);
      setIsProcessing(false);
      setPaymentStep("ready");
    }
  };

  const getButtonText = () => {
    if (plan === "free") return "CONTINUE FREE";

    switch (paymentStep) {
      case "processing":
        return "INITIALIZING SECURE PAYMENT";
      case "redirecting":
        return "REDIRECTING TO STRIPE";
      default:
        const product = STRIPE_PRODUCTS[plan];
        return `PAY ${stripeService.formatPrice(product.amount)} / MONTH`;
    }
  };

  const getButtonIcon = () => {
    if (isProcessing) {
      return <Loader />;
    }

    if (plan === "free") {
      return <CheckIcon className="w-4 h-4" />;
    }

    return <LockIcon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {plan !== "free" && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <LockIcon className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">
              Secure Payment Processing
            </h4>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-green-400" />
              <span>256-bit SSL encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-green-400" />
              <span>PCI DSS compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-green-400" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-green-400" />
              <span>Instant activation</span>
            </div>
          </div>

          {plan === "pro" && (
            <div className="mt-4 pt-3 border-t border-blue-500/10">
              <p className="text-xs text-slate-400">
                <strong className="text-blue-400">
                  ${stripeService.formatPrice(STRIPE_PRODUCTS.pro.amount)}
                </strong>{" "}
                per month • Full access to all features • Unlimited usage
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className={`
          w-full py-5 rounded-2xl font-black uppercase italic tracking-[0.3em] text-[11px] 
          transition-all flex items-center justify-center gap-3 shadow-2xl
          ${
            isProcessing
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : plan === "free"
                ? "bg-white text-black hover:bg-slate-100 active:scale-95"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:scale-95"
          }
        `}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {plan !== "free" && (
        <p className="text-[8px] text-center font-black text-slate-700 uppercase tracking-[0.4em]">
          POWERED BY STRIPE • SECURE PAYMENTS
        </p>
      )}
    </div>
  );
};

export default StripeCheckout;

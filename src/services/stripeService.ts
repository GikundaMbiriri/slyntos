import React from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { UserPlan } from "../types";

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.warn(
        "Missing Stripe publishable key. Payment functionality will be disabled.",
      );
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey, {
      // Add options to help with loading issues
      stripeAccount: undefined,
    }).catch((error) => {
      console.error("Failed to load Stripe.js:", error);
      throw new Error(`Stripe initialization failed: ${error.message}`);
    });
  }
  return stripePromise;
};

export interface PaymentConfig {
  plan: UserPlan;
  userId: string;
  userEmail: string;
  userName: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PaymentSuccessResult {
  success: boolean;
  plan: UserPlan;
  endDate: number;
  sessionId?: string;
}

// Product configurations for each plan - using Stripe Payment Links
export const STRIPE_PRODUCTS = {
  pro: {
    // Replace with your actual Stripe Payment Link URL
    paymentLink: "https://buy.stripe.com/test_your_payment_link_here",
    amount: 1000, // $10.00 in cents
    interval: "month" as const,
    name: "Pro Operator",
    description: "Unlimited access to all Slyntos features",
  },
};

export class StripeService {
  private stripe: Stripe | null = null;
  private initializationAttempted = false;

  async initialize(): Promise<void> {
    if (this.initializationAttempted && !this.stripe) {
      throw new Error("Stripe initialization previously failed");
    }

    this.initializationAttempted = true;

    try {
      this.stripe = await getStripe();
      if (!this.stripe) {
        throw new Error(
          "Failed to initialize Stripe - check console for details",
        );
      }
    } catch (error) {
      console.error("Stripe initialization error:", error);
      throw new Error(
        "Stripe is not available. Please check your internet connection and try again.",
      );
    }
  }

  async createCheckoutSession(
    config: PaymentConfig,
  ): Promise<CreateCheckoutSessionResponse> {
    if (config.plan === "free") {
      throw new Error("Cannot create checkout session for free plan");
    }

    const product = STRIPE_PRODUCTS[config.plan];
    if (!product) {
      throw new Error(`Invalid plan: ${config.plan}`);
    }

    // For frontend-only approach, we'll use Stripe Payment Links
    // or create a simple checkout redirect
    const paymentUrl = `${product.paymentLink}?prefilled_email=${encodeURIComponent(config.userEmail)}`;

    // Generate a client-side session ID for tracking
    const sessionId = `cs_frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store payment attempt in localStorage for later verification
    localStorage.setItem(
      "stripe_payment_session",
      JSON.stringify({
        sessionId,
        plan: config.plan,
        userId: config.userId,
        timestamp: Date.now(),
      }),
    );

    return {
      sessionId,
      url: paymentUrl,
    };
  }

  async redirectToCheckout(sessionId: string): Promise<void> {
    // Get the payment URL from the stored session
    const storedSession = localStorage.getItem("stripe_payment_session");
    if (!storedSession) {
      throw new Error("Payment session not found");
    }

    const session = JSON.parse(storedSession);
    const product = STRIPE_PRODUCTS[session.plan as UserPlan];

    if (!product) {
      throw new Error("Invalid payment plan");
    }

    // Redirect to Stripe Payment Link
    window.location.href = product.paymentLink;
  }

  async verifyPayment(sessionId: string): Promise<PaymentSuccessResult> {
    // For frontend-only approach, we simulate payment verification
    // In a real app, you'd verify this through Stripe's customer portal
    // or by checking the user's subscription status

    try {
      const storedSession = localStorage.getItem("stripe_payment_session");
      if (!storedSession) {
        return { success: false, plan: "free", endDate: 0 };
      }

      const session = JSON.parse(storedSession);

      // Simple verification - in production you'd verify with Stripe
      // For now, we'll assume payment was successful if we reach here
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const endDate = Date.now() + thirtyDaysInMs;

      // Clear the payment session
      localStorage.removeItem("stripe_payment_session");

      return {
        success: true,
        plan: session.plan,
        endDate,
        sessionId,
      };
    } catch (error) {
      console.error("Error verifying payment:", error);
      return { success: false, plan: "free", endDate: 0 };
    }
  }

  async createPortalSession(customerId: string): Promise<{ url: string }> {
    // For frontend-only, redirect to Stripe's customer portal
    // You'll need to configure this in your Stripe dashboard
    const portalUrl =
      "https://billing.stripe.com/p/login/test_your_portal_link";

    return { url: portalUrl };
  }

  // Utility method to format price for display
  formatPrice(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  }

  // Method to handle successful payment return from Stripe
  handlePaymentSuccess(
    urlParams: URLSearchParams,
  ): PaymentSuccessResult | null {
    // Check for Stripe success parameters
    const sessionId = urlParams.get("session_id");
    const success = urlParams.get("success");

    if (success === "true" || sessionId) {
      const storedSession = localStorage.getItem("stripe_payment_session");
      if (storedSession) {
        const session = JSON.parse(storedSession);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const endDate = Date.now() + thirtyDaysInMs;

        localStorage.removeItem("stripe_payment_session");

        return {
          success: true,
          plan: session.plan || "pro",
          endDate,
          sessionId: sessionId || session.sessionId,
        };
      }
    }

    return null;
  }
}

// Singleton instance
export const stripeService = new StripeService();

// React hook for Stripe initialization
export const useStripe = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initStripe = async () => {
      try {
        await stripeService.initialize();
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize Stripe",
        );
      } finally {
        setIsLoading(false);
      }
    };

    initStripe();
  }, []);

  return { isLoading, error, stripeService };
};

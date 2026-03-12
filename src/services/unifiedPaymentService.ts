import { UserPlan } from "../types";
import { updateUser, getUserByEmail } from "./dbService";

export type PaymentMethod = "stripe" | "tuma";
export type PaymentProvider = "mpesa" | "card" | "bank_transfer";

export interface PaymentConfig {
  plan: UserPlan;
  userId: string;
  userEmail: string;
  userName: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  phone?: string; // Required for M-Pesa
}

export interface PaymentResult {
  success: boolean;
  plan: UserPlan;
  endDate: number;
  transactionId?: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  errorMessage?: string;
}

export interface TumaAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TumaStkPushResponse {
  success: boolean;
  message: string;
  data: {
    merchant_request_id: string;
    checkout_request_id: string;
    customer_message: string;
  };
}

export interface TumaCallbackData {
  status: "completed" | "failed";
  merchant_request_id: string;
  checkout_request_id: string;
  result_code: number;
  result_desc: string;
  timestamp: string;
  mpesa_receipt_number?: string;
  amount?: number;
  failure_reason?: string;
}

export interface PaymentMethodInfo {
  name: string;
  icon: string;
  description: string;
  currency: string;
  amount: number;
}

class UnifiedPaymentService {
  private tumaToken: string | null = null;
  private tokenExpiry: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;
  private paymentCallbacks: Map<string, (result: PaymentResult) => void> =
    new Map();

  // Payment status change callback
  public onPaymentStatusChange:
    | ((status: {
        success: boolean;
        status: string;
        transactionId?: string;
        checkoutRequestId: string;
        reason?: string;
      }) => void)
    | null = null;

  // Payment method configurations
  private paymentMethods: Record<PaymentMethod, PaymentMethodInfo> = {
    tuma: {
      name: "Lipa na M-Pesa",
      icon: "📱",
      description: "Pay using M-Pesa mobile money",
      currency: "KES",
      amount: 1000, // KES 1000
    },
    stripe: {
      name: "Credit/Debit Card",
      icon: "💳",
      description: "Pay with international cards",
      currency: "USD",
      amount: 10, // $10
    },
  };

  // Provider configurations for Tuma (M-Pesa only for now)
  private providers: Record<PaymentMethod, PaymentProvider[]> = {
    tuma: ["mpesa"],
    stripe: ["card"],
  };

  /**
   * Check if a payment method is available
   */
  isMethodAvailable(method: PaymentMethod): boolean {
    switch (method) {
      case "tuma":
        const email = import.meta.env.VITE_TUMA_EMAIL;
        const apiKey = import.meta.env.VITE_TUMA_API_KEY;
        console.log("Tuma credentials check:", {
          email: email ? `${email.substring(0, 3)}***` : "missing",
          apiKey: apiKey ? `${apiKey.substring(0, 10)}***` : "missing",
        });
        return !!(email && apiKey);
      case "stripe":
        return !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      default:
        return false;
    }
  }

  /**
   * Get payment method information
   */
  getPaymentMethodInfo(method: PaymentMethod): PaymentMethodInfo | null {
    return this.paymentMethods[method] || null;
  }

  /**
   * Get available providers for a payment method
   */
  getAvailableProviders(method: PaymentMethod): PaymentProvider[] {
    return this.providers[method] || [];
  }

  /**
   * Authenticate with Tuma API and get bearer token
   */
  private async authenticateWithTuma(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tumaToken && Date.now() < this.tokenExpiry) {
      console.log("Using cached Tuma token");
      return this.tumaToken;
    }

    const email = import.meta.env.VITE_TUMA_EMAIL;
    const apiKey = import.meta.env.VITE_TUMA_API_KEY;

    if (!email || !apiKey) {
      throw new Error("Tuma API credentials not configured");
    }

    console.log("Authenticating with Tuma API...");

    try {
      const response = await fetch("https://api.tuma.co.ke/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          api_key: apiKey,
        }),
      });

      const responseText = await response.text();
      console.log("Tuma auth response status:", response.status);
      console.log(
        "Tuma auth response headers:",
        Object.fromEntries(response.headers.entries()),
      );
      console.log("Tuma auth response body:", responseText);

      if (!response.ok) {
        throw new Error(
          `Tuma authentication failed: ${response.status} ${response.statusText} - ${responseText}`,
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed Tuma auth data:", data);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        throw new Error(`Invalid JSON response from Tuma API: ${responseText}`);
      }

      // Handle Tuma's nested response structure
      // Response format: { success: true, data: { token: "..." } }
      const responseData = data.data || data; // Get nested data object or fallback to root

      // Handle different possible response formats
      const accessToken =
        responseData.token ||
        responseData.access_token ||
        responseData.jwt ||
        responseData.bearer_token ||
        responseData.auth_token ||
        data.token ||
        data.access_token;

      const expiresIn =
        responseData.expires_in || responseData.exp || data.expires_in || 3600; // Default to 1 hour

      console.log("Available keys in main response:", Object.keys(data));
      console.log("Available keys in data object:", Object.keys(responseData));
      console.log("Access token found:", !!accessToken);

      if (!accessToken) {
        console.error(
          "No access token found in response. Full response data:",
          data,
        );
        console.error("Nested data object:", responseData);
        throw new Error(
          "No access token received from Tuma API. Response: " +
            JSON.stringify(data),
        );
      }

      console.log(
        "Tuma authentication successful, token length:",
        accessToken.length,
      );
      console.log("Token starts with:", accessToken.substring(0, 20) + "...");

      // Cache the token with expiry
      this.tumaToken = accessToken;
      this.tokenExpiry = Date.now() + expiresIn * 1000 - 60000; // Subtract 1 minute for safety

      return accessToken;
    } catch (error) {
      console.error("Tuma authentication error:", error);
      // Clear cached token on error
      this.tumaToken = null;
      this.tokenExpiry = 0;
      throw new Error(
        "Failed to authenticate with M-Pesa payment gateway: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  }

  /**
   * Process M-Pesa payment using Tuma API
   */
  private async processTumaPayment(
    config: PaymentConfig,
  ): Promise<PaymentResult> {
    if (!config.phone) {
      throw new Error("Phone number is required for M-Pesa payments");
    }

    try {
      const token = await this.authenticateWithTuma();
      const paymentInfo = this.paymentMethods.tuma;

      // Ensure phone number is in correct format (254...)
      let formattedPhone = config.phone.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone;
      }

      // Use the correct Firebase Functions callback URL
      const callbackUrl =
        "https://us-central1-slyntos-a6cb8.cloudfunctions.net/tumaCallback";

      const stkPushData = {
        amount: paymentInfo.amount,
        phone: formattedPhone,
        callback_url: callbackUrl,
        description: `Slyntos ${config.plan} subscription`,
      };

      console.log("🌐 Using callback URL:", callbackUrl);

      console.log("Sending STK push with token length:", token.length);
      console.log("STK push data:", stkPushData);

      const response = await fetch("https://api.tuma.co.ke/payment/stk-push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPushData),
      });

      const responseText = await response.text();
      console.log("STK push response status:", response.status);
      console.log("STK push response:", responseText);

      if (!response.ok) {
        // If unauthorized, try to authenticate again
        if (response.status === 401) {
          console.log("Token expired, clearing cache and retrying...");
          this.tumaToken = null;
          this.tokenExpiry = 0;
          throw new Error("Authentication token expired. Please try again.");
        }
        throw new Error(
          `STK Push failed: ${response.status} ${response.statusText} - ${responseText}`,
        );
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(
          `Invalid JSON response from STK Push API: ${responseText}`,
        );
      }

      if (!result.success) {
        throw new Error(result.message || "STK Push failed");
      }

      // Store payment session in Firestore for callback processing
      const paymentSession = {
        merchantRequestId: result.data.merchant_request_id,
        checkoutRequestId: result.data.checkout_request_id,
        plan: config.plan,
        userId: config.userId,
        userEmail: config.userEmail,
        amount: paymentInfo.amount,
        timestamp: Date.now(),
        phone: formattedPhone,
        status: "pending",
      };

      // Store session in Firestore for Firebase Functions callback
      try {
        const { initializeApp, getApps, getApp } = await import("firebase/app");
        const { getFirestore, collection, addDoc, query, where, getDocs } =
          await import("firebase/firestore");

        // Initialize Firebase if not already done
        const firebaseConfig = await this.getFirebaseConfig();
        const app =
          getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

        const db = getFirestore(app);
        await addDoc(collection(db, "payment_sessions"), paymentSession);
        console.log("💾 Payment session stored in Firestore:", paymentSession);
      } catch (firestoreError) {
        console.error(
          "❌ Failed to store payment session in Firestore:",
          firestoreError,
        );
        // Fallback to localStorage for development
        localStorage.setItem(
          "tuma_payment_session",
          JSON.stringify(paymentSession),
        );
      }

      console.log("STK Push successful! Waiting for M-Pesa callback...");
      console.log("💾 Payment session stored for callback processing");
      console.log("🔍 STK Push Result Details:", {
        merchantRequestId: result.data.merchant_request_id,
        checkoutRequestId: result.data.checkout_request_id,
        customerMessage: result.data.customer_message,
        amount: paymentInfo.amount,
        phone: formattedPhone,
      });

      // Start polling Firebase Functions callback status
      this.startPaymentStatusPolling(result.data.checkout_request_id);
      console.log("⏳ Started 3-second polling for payment completion");
      console.log(
        "🎯 Polling will check for checkoutRequestId:",
        result.data.checkout_request_id,
      );

      // Return success with pending status - polling will handle completion
      return {
        success: true,
        plan: config.plan,
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        transactionId: result.data.checkout_request_id,
        merchantRequestId: result.data.merchant_request_id,
        checkoutRequestId: result.data.checkout_request_id,
      };
    } catch (error) {
      console.error("Tuma payment error:", error);
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage:
          error instanceof Error ? error.message : "M-Pesa payment failed",
      };
    }
  }

  /**
   * Process Stripe payment (simplified for now)
   */
  private async processStripePayment(
    config: PaymentConfig,
  ): Promise<PaymentResult> {
    try {
      // Since Stripe implementation is not complete, we'll provide a basic implementation
      console.log("Stripe payment processing...", config);

      // For now, just redirect to Stripe or show that it's not fully implemented
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage:
          "Stripe payment is not fully configured. Please use M-Pesa.",
      };
    } catch (error) {
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "Stripe payment failed",
      };
    }
  }

  /**
   * Test authentication with Tuma API
   */
  async testTumaAuth(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log("Testing Tuma authentication...");
      const email = import.meta.env.VITE_TUMA_EMAIL;
      const apiKey = import.meta.env.VITE_TUMA_API_KEY;

      console.log("Using credentials:", {
        email: email
          ? `${email.substring(0, 3)}***${email.substring(email.length - 3)}`
          : "missing",
        apiKey: apiKey ? `${apiKey.substring(0, 10)}***` : "missing",
      });

      const token = await this.authenticateWithTuma();
      return {
        success: true,
        message: `Authentication successful. Token length: ${token.length}`,
        details: {
          tokenLength: token.length,
          tokenStart: token.substring(0, 20) + "...",
        },
      };
    } catch (error) {
      console.error("Tuma auth test failed:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Authentication failed",
        details: { error: error instanceof Error ? error.stack : error },
      };
    }
  }

  /**
   * Direct API test without token caching
   */
  async testTumaApiDirect(): Promise<{
    success: boolean;
    message: string;
    response?: any;
  }> {
    const email = import.meta.env.VITE_TUMA_EMAIL;
    const apiKey = import.meta.env.VITE_TUMA_API_KEY;

    if (!email || !apiKey) {
      return {
        success: false,
        message: "Tuma API credentials not configured",
      };
    }

    try {
      console.log("Testing direct API call to Tuma...");
      const response = await fetch("https://api.tuma.co.ke/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          api_key: apiKey,
        }),
      });

      const responseText = await response.text();
      console.log("Direct API test response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });

      return {
        success: response.ok,
        message: response.ok
          ? "API call successful"
          : `API call failed: ${response.status} ${response.statusText}`,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        },
      };
    } catch (error) {
      console.error("Direct API test error:", error);
      return {
        success: false,
        message: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        response: { error: error instanceof Error ? error.stack : error },
      };
    }
  }

  /**
   * Main payment processing method
   */
  async processPayment(config: PaymentConfig): Promise<PaymentResult> {
    if (config.plan === "free") {
      return {
        success: true,
        plan: "free",
        endDate: 0,
      };
    }

    if (!this.isMethodAvailable(config.method)) {
      throw new Error(`Payment method ${config.method} is not available`);
    }

    switch (config.method) {
      case "tuma":
        return this.processTumaPayment(config);
      case "stripe":
        return this.processStripePayment(config);
      default:
        throw new Error(`Unsupported payment method: ${config.method}`);
    }
  }

  /**
   * Handle Tuma callback data (exact format from Tuma API documentation)
   */
  async handleTumaCallback(
    callbackData: TumaCallbackData,
  ): Promise<PaymentResult> {
    console.log("🔄 Processing Tuma callback:", callbackData);

    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      console.error("❌ No stored payment session found for callback");
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "Payment session not found",
      };
    }

    try {
      const session = JSON.parse(storedSession);
      console.log("📄 Stored session data:", session);

      // Verify this callback matches our session using checkout_request_id
      if (session.checkoutRequestId !== callbackData.checkout_request_id) {
        console.error("❌ Callback ID mismatch:", {
          stored: session.checkoutRequestId,
          received: callbackData.checkout_request_id,
        });
        return {
          success: false,
          plan: "free",
          endDate: 0,
          errorMessage: "Payment session mismatch",
        };
      }

      // Clear the stored session
      localStorage.removeItem("tuma_payment_session");
      console.log("🗑️ Payment session cleared");

      // Check if payment is successful (status = "completed" AND result_code = 0)
      if (
        callbackData.status === "completed" &&
        callbackData.result_code === 0
      ) {
        console.log("✅ Payment successful via callback!", {
          mpesaReceipt: callbackData.mpesa_receipt_number,
          amount: callbackData.amount,
          timestamp: callbackData.timestamp,
        });

        // Payment successful - update user in database
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const subscriptionEndDate = Date.now() + thirtyDaysInMs;

        try {
          console.log("🔍 Looking up user by email:", session.userEmail);
          const currentUser = await getUserByEmail(session.userEmail);

          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              plan: session.plan as UserPlan,
              subscriptionEndDate: subscriptionEndDate,
            };

            await updateUser(updatedUser);
            console.log("✅ User updated via callback!", {
              userId: currentUser.id,
              plan: session.plan,
              mpesaReceipt: callbackData.mpesa_receipt_number,
            });

            return {
              success: true,
              plan: session.plan,
              endDate: subscriptionEndDate,
              transactionId:
                callbackData.mpesa_receipt_number ||
                callbackData.checkout_request_id,
              merchantRequestId: callbackData.merchant_request_id,
              checkoutRequestId: callbackData.checkout_request_id,
            };
          } else {
            console.error("❌ User not found for email:", session.userEmail);
            return {
              success: false,
              plan: "free",
              endDate: 0,
              errorMessage: "User not found for payment update",
            };
          }
        } catch (dbError) {
          console.error("❌ Database update failed:", dbError);
          return {
            success: false,
            plan: "free",
            endDate: 0,
            errorMessage: "Failed to update user account",
          };
        }
      } else {
        // Payment failed or cancelled
        console.log("❌ Payment failed via callback:", {
          status: callbackData.status,
          resultCode: callbackData.result_code,
          resultDesc: callbackData.result_desc,
          failureReason: callbackData.failure_reason,
        });

        return {
          success: false,
          plan: "free",
          endDate: 0,
          errorMessage:
            callbackData.failure_reason ||
            callbackData.result_desc ||
            "Payment failed",
        };
      }
    } catch (error) {
      console.error("❌ Error processing Tuma callback:", error);
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "Error processing payment callback",
      };
    }
  }

  /**
   * REMOVED: Payment simulation completely disabled for security
   * Only real M-Pesa callbacks can complete payments
   */
  async simulatePaymentCompletion(
    success: boolean = true,
  ): Promise<PaymentResult> {
    console.warn(
      "🚫 Payment simulation removed - only real M-Pesa callbacks allowed",
    );
    return {
      success: false,
      plan: "free",
      endDate: 0,
      errorMessage:
        "Payment simulation disabled - complete actual M-Pesa payment",
    };
  }

  /**
   * Check for pending payment sessions (simplified - cleanup only)
   */
  checkForPendingPayments(): {
    hasPending: boolean;
    sessionData?: any;
    checkoutRequestId?: string;
  } {
    // Check localStorage for any leftover sessions (cleanup only)
    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      return { hasPending: false };
    }

    try {
      const session = JSON.parse(storedSession);
      const now = Date.now();
      const sessionAge = now - session.timestamp;

      // Clear old sessions automatically
      if (sessionAge > 10 * 60 * 1000) {
        console.log("🧹 Clearing expired localStorage payment session...");
        localStorage.removeItem("tuma_payment_session");
        return { hasPending: false };
      }

      console.log(
        "ℹ️ Found localStorage payment session - awaiting Firebase callback",
      );
      return {
        hasPending: true,
        sessionData: session,
        checkoutRequestId: session.checkoutRequestId,
      };
    } catch (error) {
      console.error("❌ Error parsing localStorage session:", error);
      localStorage.removeItem("tuma_payment_session");
      return { hasPending: false };
    }
  }

  /**
   * REMOVED: Manual payment check disabled - only real callbacks
   */
  async manualPaymentCheck(): Promise<{
    success: boolean;
    completed: boolean;
    message: string;
    result?: PaymentResult;
  }> {
    console.log(
      "🚫 Manual payment check disabled - only M-Pesa callbacks allowed",
    );

    return {
      success: true,
      completed: false,
      message:
        "Manual payment checks disabled - payments processed via Firebase Functions callbacks only",
    };
  }

  /**
   * REMOVED: Payment monitoring disabled - Firebase callbacks handle everything
   */
  resumePaymentMonitoring(checkoutRequestId: string): void {
    console.log(
      "🚫 Payment monitoring disabled - Firebase Functions handle all callbacks",
    );
  }

  /**
   * Check and process payments for a specific user (SECURED)
   * Only real M-Pesa callbacks can process payments
   */
  async checkPaymentsForUser(userEmail: string): Promise<{
    success: boolean;
    found: boolean;
    processed?: boolean;
    message: string;
    result?: PaymentResult;
  }> {
    console.log("🔍 Checking payments for user:", userEmail);

    // SECURITY: Never auto-process payments on login
    // Only Firebase Functions callbacks can upgrade users
    console.log("🛡️ Payment processing via Firebase Functions callbacks only");

    return {
      success: true,
      found: false,
      message:
        "Payments processed via secure Firebase Functions callbacks only",
    };
  }

  async checkPaymentStatus(): Promise<PaymentResult | null> {
    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      return null;
    }

    const session = JSON.parse(storedSession);
    const now = Date.now();

    // If payment session is older than 5 minutes, consider it expired
    if (now - session.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem("tuma_payment_session");
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "Payment request expired",
      };
    }

    // Return pending status
    return {
      success: false,
      plan: session.plan,
      endDate: 0,
      errorMessage: "Payment pending - please complete on your phone",
    };
  }

  /**
   * REMOVED: Payment status polling disabled
   * Real M-Pesa callbacks via Firebase Functions handle payment completion
   */
  private startPaymentStatusPolling(checkoutRequestId: string): void {
    console.log(
      "� Starting payment status polling for checkout:",
      checkoutRequestId,
    );

    let pollCount = 0;

    const pollInterval = setInterval(async () => {
      pollCount++;
      try {
        const status =
          await this.checkPaymentStatusFromCallback(checkoutRequestId);
        console.log("📊 Payment poll result:", status);

        if (status.completed) {
          console.log(
            "✅ Payment completed successfully after",
            pollCount,
            "polls!",
          );
          console.log("🎉 Final payment details:", {
            transactionId: status.transactionId,
            checkoutRequestId,
            pollCount,
          });
          clearInterval(pollInterval);

          // Notify success - could add callbacks here if needed
          if (this.onPaymentStatusChange) {
            console.log("📢 Calling onPaymentStatusChange with success");
            this.onPaymentStatusChange({
              success: true,
              status: "completed",
              transactionId: status.transactionId,
              checkoutRequestId,
            });
          } else {
            console.log("⚠️ No onPaymentStatusChange callback registered");
          }
        } else if (status.failed) {
          console.log("❌ Payment failed after", pollCount, "polls");
          console.log("💥 Failure details:", {
            reason: status.reason,
            checkoutRequestId,
            pollCount,
          });
          clearInterval(pollInterval);

          // Notify failure
          if (this.onPaymentStatusChange) {
            console.log("📢 Calling onPaymentStatusChange with failure");
            this.onPaymentStatusChange({
              success: false,
              status: "failed",
              reason: status.reason,
              checkoutRequestId,
            });
          }
        } else {
          console.log(`⏳ Payment still pending... (Poll ${pollCount}/100)`);
        }
      } catch (error) {
        console.error(`❌ Error in poll #${pollCount}:`, error);
        console.error("🔍 Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : error,
          checkoutRequestId,
          pollCount,
        });
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes (100 polls)
    setTimeout(() => {
      clearInterval(pollInterval);
      console.log(
        "⏰ Payment polling timeout reached after",
        pollCount,
        "polls",
      );
      console.log("🔍 Final timeout details:", {
        checkoutRequestId,
        totalPolls: pollCount,
        timeoutMinutes: 5,
      });

      if (this.onPaymentStatusChange) {
        console.log("📢 Calling onPaymentStatusChange with timeout");
        this.onPaymentStatusChange({
          success: false,
          status: "timeout",
          reason: "Payment polling timeout after 5 minutes",
          checkoutRequestId,
        });
      }
    }, 300000);
  }

  /**
   * Check Firebase Firestore for real M-Pesa callback completion status
   */
  private async checkPaymentStatusFromCallback(
    checkoutRequestId: string,
  ): Promise<{
    completed: boolean;
    failed: boolean;
    pending: boolean;
    reason?: string;
    transactionId?: string;
  }> {
    try {
      console.log(
        "🔍 Checking Firebase for payment status:",
        checkoutRequestId,
      );
      console.log("📱 Loading Firebase modules...");

      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const { getFirestore, collection, query, where, getDocs } =
        await import("firebase/firestore");

      console.log("🏗️ Getting Firebase app...");
      let app;
      try {
        app = getApp();
      } catch (error) {
        console.log("🔧 No Firebase app found, initializing...");
        const firebaseConfig = await this.getFirebaseConfig();
        app = initializeApp(firebaseConfig);
      }
      const db = getFirestore(app);
      console.log("✅ Firebase app and db initialized");

      // Query payment sessions for this checkout request
      console.log(
        "📝 Creating Firestore query for checkout request:",
        checkoutRequestId,
      );
      const q = query(
        collection(db, "payment_sessions"),
        where("checkoutRequestId", "==", checkoutRequestId),
      );

      console.log("🔎 Executing Firestore query...");
      const querySnapshot = await getDocs(q);

      console.log("📊 Query results:", {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        checkoutRequestId,
      });

      if (querySnapshot.empty) {
        console.log("📭 No payment session found in Firestore");
        console.log("⚠️ This could mean:");
        console.log("   - Session not stored properly");
        console.log("   - CheckoutRequestId mismatch");
        console.log(
          "   - Firebase Functions already processed and deleted session (old behavior)",
        );
        console.log("   - Firebase Functions callback completed successfully");

        // For debugging - let's check if there are any sessions at all
        try {
          const allSessionsQuery = query(collection(db, "payment_sessions"));
          const allSessions = await getDocs(allSessionsQuery);
          console.log(
            "🔍 Total payment sessions in Firestore:",
            allSessions.size,
          );

          if (allSessions.size > 0) {
            console.log("📋 Available checkoutRequestIds:");
            allSessions.docs.forEach((doc, index) => {
              const data = doc.data();
              console.log(
                `  ${index + 1}. ${data.checkoutRequestId} (status: ${data.status || "pending"})`,
              );
            });
          }
        } catch (debugError) {
          console.error("❌ Debug query failed:", debugError);
        }

        // If session not found, it might have been processed successfully by Firebase Functions
        // Check if user was already upgraded by looking for recent payment records
        try {
          const paymentsQuery = query(
            collection(db, "payments"),
            where("checkoutRequestId", "==", checkoutRequestId),
          );
          const paymentDocs = await getDocs(paymentsQuery);

          if (!paymentDocs.empty) {
            const paymentData = paymentDocs.docs[0].data();
            console.log(
              "✅ Found completed payment record - user already upgraded!",
            );
            console.log("💳 Payment details:", {
              status: paymentData.status,
              transactionId: paymentData.transactionId,
              plan: paymentData.plan,
              userEmail: paymentData.userEmail,
            });

            if (paymentData.status === "completed") {
              return {
                completed: true,
                failed: false,
                pending: false,
                transactionId: paymentData.transactionId,
              };
            }
          }
        } catch (paymentCheckError) {
          console.error("❌ Payment record check failed:", paymentCheckError);
        }

        return { completed: false, failed: false, pending: true };
      }

      // Check the latest session document
      console.log("📄 Found", querySnapshot.docs.length, "payment sessions");
      const sessionDoc = querySnapshot.docs[0];
      const sessionData = sessionDoc.data();

      console.log("📋 Complete payment session data:", {
        docId: sessionDoc.id,
        data: sessionData,
        timestamp: new Date(sessionData.timestamp).toISOString(),
      });

      // Log all possible status fields for debugging
      console.log("🔍 Status field analysis:", {
        "sessionData.status": sessionData.status,
        "sessionData.paymentCompleted": sessionData.paymentCompleted,
        "sessionData.paymentFailed": sessionData.paymentFailed,
        "sessionData.transactionId": sessionData.transactionId,
        "sessionData.M_PesaReceiptNumber": sessionData.M_PesaReceiptNumber,
        "sessionData.mpesa_receipt_number": sessionData.mpesa_receipt_number,
        "sessionData.failureReason": sessionData.failureReason,
      });

      // Check if payment was completed by Firebase Functions callback
      if (sessionData.status === "completed" || sessionData.paymentCompleted) {
        console.log("🎉 PAYMENT COMPLETED DETECTED!");
        console.log("✅ Completion details:", {
          status: sessionData.status,
          paymentCompleted: sessionData.paymentCompleted,
          transactionId:
            sessionData.transactionId ||
            sessionData.M_PesaReceiptNumber ||
            sessionData.mpesa_receipt_number,
        });
        return {
          completed: true,
          failed: false,
          pending: false,
          transactionId:
            sessionData.transactionId ||
            sessionData.M_PesaReceiptNumber ||
            sessionData.mpesa_receipt_number,
        };
      }

      // Check if payment failed
      if (sessionData.status === "failed" || sessionData.paymentFailed) {
        console.log("💥 PAYMENT FAILURE DETECTED!");
        console.log("❌ Failure details:", {
          status: sessionData.status,
          paymentFailed: sessionData.paymentFailed,
          reason: sessionData.failureReason,
        });
        return {
          completed: false,
          failed: true,
          pending: false,
          reason: sessionData.failureReason || "Payment failed",
        };
      }

      // Still pending
      console.log("⏳ Payment still pending in Firebase");
      console.log(
        "📊 Session age:",
        Math.floor((Date.now() - sessionData.timestamp) / 1000),
        "seconds",
      );
      return { completed: false, failed: false, pending: true };
    } catch (error) {
      console.error("❌ Error checking Firebase payment status:", error);
      console.error("🔍 Detailed error info:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : error,
        checkoutRequestId,
        timestamp: new Date().toISOString(),
      });
      // Return pending on error, don't fail the polling
      return { completed: false, failed: false, pending: true };
    }
  }

  /**
   * REMOVED: Payment processing functions disabled
   * Firebase Functions callbacks handle all payment processing
   */
  private async processPaymentCompletion(
    checkoutRequestId: string,
    statusResult: any,
  ): Promise<void> {
    console.log(
      "🚫 Payment processing disabled - handled by Firebase Functions",
    );
    // All payment processing is now handled by Firebase Functions callbacks
  }

  /**
   * REMOVED: Payment failure processing disabled
   * Firebase Functions callbacks handle all payment processing
   */
  private async processPaymentFailure(
    checkoutRequestId: string,
    reason: string,
  ): Promise<void> {
    console.log(
      "🚫 Payment failure processing disabled - handled by Firebase Functions",
    );
    // All payment processing is now handled by Firebase Functions callbacks
  }

  /**
   * Register a callback for payment completion
   */
  registerPaymentCallback(
    checkoutRequestId: string,
    callback: (result: PaymentResult) => void,
  ): void {
    this.paymentCallbacks.set(checkoutRequestId, callback);
  }

  /**
   * Stop payment polling
   */
  stopPaymentPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("🛑 Payment polling stopped");
    }
  }

  /**
   * Debug function to check what payment sessions exist in Firestore
   */
  async debugFirestorePaymentSessions(): Promise<{
    success: boolean;
    total: number;
    sessions: any[];
    error?: string;
  }> {
    try {
      console.log("🧪 DEBUG: Fetching all payment sessions from Firestore...");

      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const { getFirestore, collection, getDocs } =
        await import("firebase/firestore");

      const app = getApp();
      const db = getFirestore(app);

      const querySnapshot = await getDocs(collection(db, "payment_sessions"));

      const sessions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
        age:
          Math.floor((Date.now() - doc.data().timestamp) / 1000) + " seconds",
      }));

      console.log(
        "🔍 Found",
        sessions.length,
        "payment sessions in Firestore:",
      );
      sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          checkoutRequestId: session.data.checkoutRequestId,
          status: session.data.status,
          userEmail: session.data.userEmail,
          plan: session.data.plan,
          age: session.age,
          paymentCompleted: session.data.paymentCompleted,
          paymentFailed: session.data.paymentFailed,
        });
      });

      return {
        success: true,
        total: sessions.length,
        sessions,
      };
    } catch (error) {
      console.error("❌ Error fetching Firestore sessions:", error);
      return {
        success: false,
        total: 0,
        sessions: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test database connectivity and user lookup (debugging helper)
   */
  async testDatabaseConnection(
    userEmail: string,
  ): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      console.log("🧪 Testing database connection with email:", userEmail);

      const user = await getUserByEmail(userEmail);
      console.log("🧪 Database lookup result:", user);

      if (user) {
        return {
          success: true,
          message: `User found: ${user.username} (${user.email}) - Plan: ${user.plan}`,
          user: user,
        };
      } else {
        return {
          success: false,
          message: `No user found with email: ${userEmail}`,
        };
      }
    } catch (error) {
      console.error("🧪 Database test failed:", error);
      return {
        success: false,
        message: `Database error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get formatted price for display
   */
  getFormattedPrice(method: PaymentMethod): string {
    const info = this.paymentMethods[method];
    if (!info) return "";

    if (info.currency === "KES") {
      return `KES ${info.amount}.00`;
    } else {
      return `$${info.amount}.00`;
    }
  }

  /**
   * DEBUGGING HELPER: Check for user plan updates in database
   * This helps verify if Firebase Functions successfully upgraded the user
   */
  async checkUserPlanStatus(userEmail: string): Promise<{
    success: boolean;
    currentPlan: string;
    subscriptionEndDate?: number;
    lastPayment?: any;
    message: string;
  }> {
    try {
      console.log("🔍 Checking current user plan status for:", userEmail);

      const user = await getUserByEmail(userEmail);

      if (!user) {
        return {
          success: false,
          currentPlan: "free",
          message: "User not found",
        };
      }

      console.log("👤 Current user data:", {
        id: user.id,
        email: user.email,
        username: user.username,
        plan: user.plan,
        subscriptionEndDate: user.subscriptionEndDate
          ? new Date(user.subscriptionEndDate).toISOString()
          : "none",
        lastPaymentTimestamp: user.lastPayment?.timestamp || "none",
      });

      return {
        success: true,
        currentPlan: user.plan || "free",
        subscriptionEndDate: user.subscriptionEndDate,
        lastPayment: user.lastPayment,
        message: `User has ${user.plan || "free"} plan`,
      };
    } catch (error) {
      console.error("❌ Error checking user plan:", error);
      return {
        success: false,
        currentPlan: "free",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get Firebase configuration from environment variables
   */
  private async getFirebaseConfig(): Promise<any> {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
  }
}

// Singleton instance
export const unifiedPaymentService = new UnifiedPaymentService();

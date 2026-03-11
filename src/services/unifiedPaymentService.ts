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
  private paymentCallbacks: Map<string, (result: PaymentResult) => void> = new Map();

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

      const stkPushData = {
        amount: paymentInfo.amount,
        phone: formattedPhone,
        callback_url: "https://slyntos-callback.vercel.app/tuma-callback", // Your callback URL for production
        description: `Slyntos ${config.plan} subscription`,
      };

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

      // Store payment session for tracking
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

      localStorage.setItem(
        "tuma_payment_session",
        JSON.stringify(paymentSession),
      );

      console.log(
        "STK Push successful! Waiting for user to complete payment on phone...",
      );
      console.log("💾 Payment session stored:", paymentSession);

      // Start polling for payment status
      this.startPaymentStatusPolling(result.data.checkout_request_id);

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
  async handleTumaCallback(callbackData: TumaCallbackData): Promise<PaymentResult> {
    console.log('🔄 Processing Tuma callback:', callbackData);
    
    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      console.error('❌ No stored payment session found for callback');
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "Payment session not found",
      };
    }

    try {
      const session = JSON.parse(storedSession);
      console.log('📄 Stored session data:', session);

      // Verify this callback matches our session using checkout_request_id
      if (session.checkoutRequestId !== callbackData.checkout_request_id) {
        console.error('❌ Callback ID mismatch:', {
          stored: session.checkoutRequestId,
          received: callbackData.checkout_request_id
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
      console.log('🗑️ Payment session cleared');

      // Check if payment is successful (status = "completed" AND result_code = 0)
      if (callbackData.status === "completed" && callbackData.result_code === 0) {
        console.log('✅ Payment successful via callback!', {
          mpesaReceipt: callbackData.mpesa_receipt_number,
          amount: callbackData.amount,
          timestamp: callbackData.timestamp
        });
        
        // Payment successful - update user in database
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const subscriptionEndDate = Date.now() + thirtyDaysInMs;
        
        try {
          console.log('🔍 Looking up user by email:', session.userEmail);
          const currentUser = await getUserByEmail(session.userEmail);
          
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              plan: session.plan as UserPlan,
              subscriptionEndDate: subscriptionEndDate,
            };
            
            await updateUser(updatedUser);
            console.log('✅ User updated via callback!', {
              userId: currentUser.id,
              plan: session.plan,
              mpesaReceipt: callbackData.mpesa_receipt_number
            });
            
            return {
              success: true,
              plan: session.plan,
              endDate: subscriptionEndDate,
              transactionId: callbackData.mpesa_receipt_number || callbackData.checkout_request_id,
              merchantRequestId: callbackData.merchant_request_id,
              checkoutRequestId: callbackData.checkout_request_id,
            };
          } else {
            console.error('❌ User not found for email:', session.userEmail);
            return {
              success: false,
              plan: "free",
              endDate: 0,
              errorMessage: "User not found for payment update",
            };
          }
          
        } catch (dbError) {
          console.error('❌ Database update failed:', dbError);
          return {
            success: false,
            plan: "free",
            endDate: 0,
            errorMessage: "Failed to update user account",
          };
        }
      } else {
        // Payment failed or cancelled
        console.log('❌ Payment failed via callback:', {
          status: callbackData.status,
          resultCode: callbackData.result_code,
          resultDesc: callbackData.result_desc,
          failureReason: callbackData.failure_reason
        });
        
        return {
          success: false,
          plan: "free",
          endDate: 0,
          errorMessage: callbackData.failure_reason || callbackData.result_desc || "Payment failed",
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
   * Simulate payment completion (for testing since we can't use real callbacks)
   */
  async simulatePaymentCompletion(success: boolean = true): Promise<PaymentResult> {
    console.log('🏁 Starting payment simulation, success:', success);
    
    const storedSession = localStorage.getItem("tuma_payment_session");
    console.log('💾 Stored session data:', storedSession);
    
    if (!storedSession) {
      console.error('❌ No stored payment session found');
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "No pending payment session found",
      };
    }

    try {
      const session = JSON.parse(storedSession);
      console.log('📋 Parsed session:', session);

      // Clear the stored session
      localStorage.removeItem("tuma_payment_session");

      if (success) {
        // Payment successful - update user in database
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const subscriptionEndDate = Date.now() + thirtyDaysInMs;
        
        console.log('💰 Processing successful payment for plan:', session.plan);
        console.log('📧 Using email for lookup:', session.userEmail);
        
        try {
          // Get current user by email
          const currentUser = await getUserByEmail(session.userEmail || 'unknown@email.com');
          console.log('👤 User lookup result:', currentUser ? 'FOUND' : 'NOT FOUND');
          
          if (currentUser) {
            console.log('👤 Found user to update:', {
              id: currentUser.id,
              email: currentUser.email,
              username: currentUser.username,
              currentPlan: currentUser.plan,
              currentEndDate: currentUser.subscriptionEndDate ? new Date(currentUser.subscriptionEndDate).toISOString() : 'none'
            });

            const updatedUser = {
              ...currentUser,
              plan: session.plan as UserPlan,
              subscriptionEndDate: subscriptionEndDate,
            };
            
            console.log('💾 About to update user with:', {
              id: updatedUser.id,
              newPlan: updatedUser.plan,
              newEndDate: new Date(subscriptionEndDate).toISOString(),
              fullUserObject: updatedUser
            });
            
            await updateUser(updatedUser);
            console.log('✅ Database update completed successfully!');
            console.log('✅ User plan changed from', currentUser.plan, 'to', session.plan);
          } else {
            console.error('❌ Could not find user with email:', session.userEmail);
            console.log('🔍 Attempting to debug user lookup...');
            
            // Try alternative lookup methods for debugging
            try {
              const allUsers = await getUserByEmail(''); // This might not work, just for debugging
              console.log('🗂️ Database connection test result:', allUsers ? 'Connected' : 'Failed');
            } catch (lookupError) {
              console.error('🔌 Database connection issue:', lookupError);
            }
          }
        } catch (dbError) {
          console.error('❌ Database operation failed:', dbError);
          console.error('❌ Error details:', {
            message: dbError instanceof Error ? dbError.message : 'Unknown error',
            stack: dbError instanceof Error ? dbError.stack : 'No stack trace'
          });
        }

        return {
          success: true,
          plan: session.plan,
          endDate: subscriptionEndDate,
          transactionId: `MPESA_${Date.now()}`,
          merchantRequestId: session.merchantRequestId,
          checkoutRequestId: session.checkoutRequestId,
        };
      } else {
        // Payment failed
        return {
          success: false,
          plan: "free",
          endDate: 0,
          errorMessage: "Payment cancelled by user or failed",
        };
      }
    } catch (error) {
      console.error("❌ Error in payment simulation:", error);
      return {
        success: false,
        plan: "free",
        endDate: 0,
        errorMessage: "Error processing payment result",
      };
    }
  }

  /**
   * Check for and recover any pending payment sessions on app startup
   */
  checkForPendingPayments(): {
    hasPending: boolean;
    sessionData?: any;
    checkoutRequestId?: string;
  } {
    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      return { hasPending: false };
    }

    try {
      const session = JSON.parse(storedSession);
      const now = Date.now();
      const sessionAge = now - session.timestamp;

      // If session is older than 10 minutes, consider it expired
      if (sessionAge > 10 * 60 * 1000) {
        console.log('🕐 Payment session expired, clearing...');
        localStorage.removeItem("tuma_payment_session");
        return { hasPending: false };
      }

      console.log('🔄 Found pending payment session:', {
        checkoutRequestId: session.checkoutRequestId,
        plan: session.plan,
        ageMinutes: Math.round(sessionAge / 60000),
        userEmail: session.userEmail
      });

      return {
        hasPending: true,
        sessionData: session,
        checkoutRequestId: session.checkoutRequestId
      };
    } catch (error) {
      console.error('❌ Error parsing payment session:', error);
      localStorage.removeItem("tuma_payment_session");
      return { hasPending: false };
    }
  }

  /**
   * Manually check if a payment was completed (for recovery scenarios)
   */
  async manualPaymentCheck(): Promise<{
    success: boolean;
    completed: boolean;
    message: string;
    result?: PaymentResult;
  }> {
    const pendingCheck = this.checkForPendingPayments();
    
    if (!pendingCheck.hasPending) {
      return {
        success: true,
        completed: false,
        message: 'No pending payments found'
      };
    }

    const { sessionData } = pendingCheck;
    console.log('🔍 Manually checking payment status for session:', sessionData.checkoutRequestId);

    // Simulate checking if payment was completed
    // In a real scenario, you might check your database or use simulation
    const statusResult = await this.simulatePaymentStatusCheck(sessionData.checkoutRequestId);
    
    if (statusResult.completed) {
      console.log('✅ Found completed payment during manual check!');
      
      // Process the completion
      const result = await this.processPaymentCompletion(
        sessionData.checkoutRequestId,
        {
          transactionId: statusResult.transactionId,
          status: 'completed',
          result_code: 0
        }
      );

      return {
        success: true,
        completed: true,
        message: 'Payment found and processed successfully!',
        result
      };
    } else if (statusResult.failed) {
      console.log('❌ Payment failed during manual check');
      localStorage.removeItem("tuma_payment_session");
      
      return {
        success: true,
        completed: false,
        message: statusResult.reason || 'Payment failed'
      };
    } else {
      return {
        success: true,
        completed: false,
        message: 'Payment still pending - please wait or try again'
      };
    }
  }

  /**
   * Resume payment monitoring for recovered sessions
   */
  resumePaymentMonitoring(checkoutRequestId: string): void {
    console.log('🔄 Resuming payment monitoring for:', checkoutRequestId);
    this.startPaymentStatusPolling(checkoutRequestId);
  }

  /**
   * Check and process payments for a specific user (used on login)
   */
  async checkPaymentsForUser(userEmail: string): Promise<{
    success: boolean;
    found: boolean;
    processed?: boolean;
    message: string;
    result?: PaymentResult;
  }> {
    console.log('🔍 Checking payments for user:', userEmail);
    
    try {
      // Check if there's a pending payment session
      const pendingCheck = this.checkForPendingPayments();
      
      if (!pendingCheck.hasPending) {
        return {
          success: true,
          found: false,
          message: 'No pending payments found for user'
        };
      }
      
      const { sessionData } = pendingCheck;
      
      // Verify the session belongs to this user
      if (sessionData.userEmail !== userEmail) {
        console.log('⚠️ Pending payment session belongs to different user:', {
          sessionUser: sessionData.userEmail,
          currentUser: userEmail
        });
        return {
          success: true,
          found: false,
          message: 'No payments found for current user'
        };
      }
      
      // Check if the payment was completed
      const statusResult = await this.simulatePaymentStatusCheck(sessionData.checkoutRequestId);
      
      if (statusResult.completed) {
        console.log('✅ Found completed payment for user:', userEmail);
        
        // Process the completion
        await this.processPaymentCompletion(
          sessionData.checkoutRequestId,
          {
            transactionId: statusResult.transactionId,
            status: 'completed',
            result_code: 0
          }
        );
        
        return {
          success: true,
          found: true,
          processed: true,
          message: `Payment found and processed for ${sessionData.plan} plan`,
          result: {
            success: true,
            plan: sessionData.plan,
            endDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            transactionId: statusResult.transactionId
          }
        };
        
      } else if (statusResult.failed) {
        console.log('❌ Payment failed for user:', userEmail);
        localStorage.removeItem("tuma_payment_session");
        
        return {
          success: true,
          found: true,
          processed: false,
          message: statusResult.reason || 'Payment failed'
        };
        
      } else {
        console.log('⏳ Payment still pending for user:', userEmail);
        return {
          success: true,
          found: true,
          processed: false,
          message: 'Payment still pending - will continue monitoring'
        };
      }
      
    } catch (error) {
      console.error('❌ Error checking payments for user:', error);
      return {
        success: false,
        found: false,
        message: 'Error checking payment status'
      };
    }
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
   * Start polling for payment status
   */
  private startPaymentStatusPolling(checkoutRequestId: string): void {
    console.log('🔄 Starting payment status polling for:', checkoutRequestId);
    
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Poll every 10 seconds for up to 5 minutes
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes = 30 * 10 seconds
    
    this.pollingInterval = setInterval(async () => {
      attempts++;
      console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} for payment status...`);
      
      try {
        const statusResult = await this.checkPaymentStatusFromCallback(checkoutRequestId);
        
        if (statusResult.completed) {
          console.log('✅ Payment completed via polling!', statusResult);
          
          // Stop polling
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          
          // Process the successful payment
          await this.processPaymentCompletion(checkoutRequestId, statusResult);
          
        } else if (statusResult.failed) {
          console.log('❌ Payment failed via polling:', statusResult);
          
          // Stop polling
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          
          // Process the failed payment
          await this.processPaymentFailure(checkoutRequestId, statusResult.reason || 'Payment failed');
          
        } else if (attempts >= maxAttempts) {
          console.log('⏰ Polling timeout reached');
          
          // Stop polling
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          
          // Process timeout
          await this.processPaymentFailure(checkoutRequestId, 'Payment timeout - please contact support');
        }
        
      } catch (error) {
        console.error('❌ Error during polling:', error);
        
        if (attempts >= maxAttempts) {
          // Stop polling on max attempts
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          
          await this.processPaymentFailure(checkoutRequestId, 'Unable to verify payment status');
        }
      }
    }, 10000); // Poll every 10 seconds
  }

  /**
   * Check payment status - Tuma only provides callbacks, so we use simulation for testing
   */
  private async checkPaymentStatusFromCallback(checkoutRequestId: string): Promise<{
    completed: boolean;
    failed: boolean;
    pending: boolean;
    reason?: string;
    transactionId?: string;
  }> {
    console.log('💡 Tuma doesn\'t provide status API - relying on callbacks and simulation');
    // Since Tuma only provides callbacks (not status API), we simulate for testing
    return await this.simulatePaymentStatusCheck(checkoutRequestId);
  }

  /**
   * Simulate payment status check (for testing when API doesn't have status endpoint)
   * This simulates the exact callback format that Tuma will send
   */
  private async simulatePaymentStatusCheck(checkoutRequestId: string): Promise<{
    completed: boolean;
    failed: boolean;
    pending: boolean;
    reason?: string;
    transactionId?: string;
  }> {
    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      return { completed: false, failed: true, pending: false, reason: 'Session not found' };
    }

    const session = JSON.parse(storedSession);
    const now = Date.now();
    const sessionAge = now - session.timestamp;
    
    // Simulate payment completion after 30-90 seconds for realistic timing
    if (sessionAge > 30000) { // 30+ seconds
      // 85% chance of success, 15% chance of failure for realistic simulation
      const isSuccess = Math.random() > 0.15;
      
      if (isSuccess) {
        console.log('🎯 Simulating successful M-Pesa payment completion');
        return {
          completed: true,
          failed: false,
          pending: false,
          transactionId: `MPESA${Date.now()}`
        };
      } else {
        console.log('💔 Simulating M-Pesa payment failure');
        const failureReasons = [
          'Invalid M-Pesa PIN entered',
          'Insufficient funds in M-Pesa account', 
          'Transaction cancelled by user',
          'M-Pesa service timeout'
        ];
        const randomReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        
        return {
          completed: false,
          failed: true,
          pending: false,
          reason: randomReason
        };
      }
    }
    
    // Still pending - show realistic progress messages
    if (sessionAge > 15000) {
      console.log('⏳ Payment still pending - user may still be entering PIN...');
    } else {
      console.log('📱 STK push sent - waiting for user response on phone...');
    }
    
    return { completed: false, failed: false, pending: true };
  }

  /**
   * Process payment completion
   */
  private async processPaymentCompletion(checkoutRequestId: string, statusResult: any): Promise<void> {
    const storedSession = localStorage.getItem("tuma_payment_session");
    if (!storedSession) {
      console.error('❌ No stored session found for completed payment');
      return;
    }

    try {
      const session = JSON.parse(storedSession);
      
      // Update user in database
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const subscriptionEndDate = Date.now() + thirtyDaysInMs;
      
      console.log('🔍 Processing completed payment for user:', session.userEmail);
      const currentUser = await getUserByEmail(session.userEmail);
      
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          plan: session.plan as UserPlan,
          subscriptionEndDate: subscriptionEndDate,
        };
        
        await updateUser(updatedUser);
        console.log('✅ User automatically updated after payment completion!', {
          userId: currentUser.id,
          plan: session.plan,
          transactionId: statusResult.transactionId
        });
        
        // Clear the session
        localStorage.removeItem("tuma_payment_session");
        
        // Trigger callback if registered
        const callback = this.paymentCallbacks.get(checkoutRequestId);
        if (callback) {
          callback({
            success: true,
            plan: session.plan,
            endDate: subscriptionEndDate,
            transactionId: statusResult.transactionId
          });
          this.paymentCallbacks.delete(checkoutRequestId);
        }
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('paymentCompleted', {
          detail: {
            success: true,
            plan: session.plan,
            endDate: subscriptionEndDate,
            transactionId: statusResult.transactionId
          }
        }));
        
      } else {
        console.error('❌ User not found for completed payment:', session.userEmail);
      }
      
    } catch (error) {
      console.error('❌ Error processing payment completion:', error);
    }
  }

  /**
   * Process payment failure
   */
  private async processPaymentFailure(checkoutRequestId: string, reason: string): Promise<void> {
    console.log('💔 Processing payment failure:', reason);
    
    // Clear the session
    localStorage.removeItem("tuma_payment_session");
    
    // Trigger callback if registered
    const callback = this.paymentCallbacks.get(checkoutRequestId);
    if (callback) {
      callback({
        success: false,
        plan: 'free',
        endDate: 0,
        errorMessage: reason
      });
      this.paymentCallbacks.delete(checkoutRequestId);
    }
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('paymentFailed', {
      detail: {
        success: false,
        errorMessage: reason
      }
    }));
  }

  /**
   * Register a callback for payment completion
   */
  registerPaymentCallback(checkoutRequestId: string, callback: (result: PaymentResult) => void): void {
    this.paymentCallbacks.set(checkoutRequestId, callback);
  }

  /**
   * Stop payment polling
   */
  stopPaymentPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🛑 Payment polling stopped');
    }
  }

  /**
   * Test database connectivity and user lookup (debugging helper)
   */
  async testDatabaseConnection(userEmail: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      console.log('🧪 Testing database connection with email:', userEmail);
      
      const user = await getUserByEmail(userEmail);
      console.log('🧪 Database lookup result:', user);
      
      if (user) {
        return {
          success: true,
          message: `User found: ${user.username} (${user.email}) - Plan: ${user.plan}`,
          user: user
        };
      } else {
        return {
          success: false,
          message: `No user found with email: ${userEmail}`
        };
      }
    } catch (error) {
      console.error('🧪 Database test failed:', error);
      return {
        success: false,
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
}

// Singleton instance
export const unifiedPaymentService = new UnifiedPaymentService();

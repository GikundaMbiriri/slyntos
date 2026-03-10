import React, { useState, useEffect } from "react";
import {
  unifiedPaymentService,
  PaymentMethod,
  PaymentProvider,
  PaymentConfig,
} from "../services/unifiedPaymentService";
import { UserPlan } from "../types";
import Loader from "./Loader";
import CheckIcon from "./icons/CheckIcon";
import ClockIcon from "./icons/ClockIcon";
import LockIcon from "./icons/LockIcon";
import RocketIcon from "./icons/RocketIcon";

interface UnifiedPaymentProps {
  plan: UserPlan;
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess: (plan: UserPlan, endDate: number) => void;
  onError: (error: string) => void;
}

const UnifiedPayment: React.FC<UnifiedPaymentProps> = ({
  plan,
  userId,
  userEmail,
  userName,
  onSuccess,
  onError,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("tuma");
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProvider>("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "ready" | "processing" | "pending" | "success"
  >("ready");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [recoveredPayment, setRecoveredPayment] = useState<{
    found: boolean;
    checkoutRequestId?: string;
    plan?: string;
  }>({ found: false });

  const manualPaymentCheck = async () => {
    console.log("🔍 Manual payment check triggered...");
    setIsProcessing(true);

    try {
      const checkResult = await unifiedPaymentService.manualPaymentCheck();
      console.log("🔍 Manual check result:", checkResult);

      if (checkResult.completed && checkResult.result) {
        console.log("✅ Payment found and processed!");
        setPaymentStep("success");
        setPendingPayment(false);
        setRecoveredPayment({ found: false });
        onSuccess(checkResult.result.plan, checkResult.result.endDate);
      } else {
        alert(checkResult.message);
      }
    } catch (error) {
      console.error("❌ Manual check error:", error);
      alert("Error checking payment status. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Auto-select first available payment method
    const availableMethods: PaymentMethod[] = (
      ["tuma", "stripe"] as PaymentMethod[]
    ).filter((method) => unifiedPaymentService.isMethodAvailable(method));

    if (availableMethods.length > 0) {
      setSelectedMethod(availableMethods[0]);
      if (availableMethods[0] === "tuma") {
        setSelectedProvider("mpesa");
        setShowPhoneInput(true);

        // Test Tuma API immediately with detailed logging
        console.log("=== TESTING TUMA API ===");

        // Test direct API call first
        unifiedPaymentService.testTumaApiDirect().then((result) => {
          console.log("Direct API test result:", result);
        });

        // Test authentication method
        unifiedPaymentService.testTumaAuth().then((result) => {
          console.log("Auth test result:", result);
          if (!result.success) {
            console.error("Tuma authentication test failed:", result.message);
          }
        });
      }
    }

    // Check for any pending payments from previous sessions (recovery)
    const pendingCheck = unifiedPaymentService.checkForPendingPayments();
    if (pendingCheck.hasPending && pendingCheck.sessionData) {
      console.log("🔄 Recovering pending payment session...");
      setRecoveredPayment({
        found: true,
        checkoutRequestId: pendingCheck.checkoutRequestId,
        plan: pendingCheck.sessionData.plan,
      });
      setPendingPayment(true);
      setPaymentStep("pending");

      // Resume monitoring the payment
      if (pendingCheck.checkoutRequestId) {
        unifiedPaymentService.resumePaymentMonitoring(
          pendingCheck.checkoutRequestId,
        );
      }
    }

    // Setup automatic payment completion listeners
    const handlePaymentCompleted = (event: CustomEvent) => {
      console.log("🎉 Auto payment completed event received:", event.detail);
      const {
        success,
        plan: resultPlan,
        endDate,
        transactionId,
      } = event.detail;

      if (success) {
        console.log("✅ Auto payment successful, updating UI...");
        setPaymentStep("success");
        setPendingPayment(false);
        setIsProcessing(false);

        // Call onSuccess to update parent component
        console.log("📢 Auto calling onSuccess with:", {
          plan: resultPlan,
          endDate,
        });
        onSuccess(resultPlan, endDate);
        console.log("💳 Transaction ID:", transactionId);
      }
    };

    const handlePaymentFailed = (event: CustomEvent) => {
      console.log("💔 Auto payment failed event received:", event.detail);
      const { errorMessage } = event.detail;

      setPendingPayment(false);
      setPaymentStep("ready");
      setIsProcessing(false);
      onError(errorMessage || "Payment failed automatically");
    };

    // Add event listeners
    window.addEventListener(
      "paymentCompleted",
      handlePaymentCompleted as EventListener,
    );
    window.addEventListener(
      "paymentFailed",
      handlePaymentFailed as EventListener,
    );

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener(
        "paymentCompleted",
        handlePaymentCompleted as EventListener,
      );
      window.removeEventListener(
        "paymentFailed",
        handlePaymentFailed as EventListener,
      );
      unifiedPaymentService.stopPaymentPolling(); // Stop any ongoing polling
    };
  }, [onSuccess, onError]);

  useEffect(() => {
    // Show phone input for M-Pesa payments
    setShowPhoneInput(
      selectedMethod === "tuma" && selectedProvider === "mpesa",
    );
  }, [selectedMethod, selectedProvider]);

  const handlePayment = async () => {
    if (plan === "free") {
      onSuccess(plan, 0);
      return;
    }

    // Validate phone number for M-Pesa payments
    if (selectedMethod === "tuma" && selectedProvider === "mpesa") {
      if (!phoneNumber.trim()) {
        onError("Please enter your M-Pesa phone number");
        return;
      }

      // Basic phone validation
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 9 || cleanPhone.length > 12) {
        onError("Please enter a valid phone number (e.g., 0712345678)");
        return;
      }
    }

    setIsProcessing(true);
    setPaymentStep("processing");

    try {
      const paymentConfig: PaymentConfig = {
        plan,
        userId,
        userEmail,
        userName,
        method: selectedMethod,
        provider: selectedProvider,
        phone: selectedMethod === "tuma" ? phoneNumber : undefined,
      };

      const result = await unifiedPaymentService.processPayment(paymentConfig);

      if (result && result.success) {
        console.log(
          "🎉 STK Push sent successfully! Waiting for user confirmation...",
        );

        // Register callback for automatic payment completion
        if (result.checkoutRequestId) {
          unifiedPaymentService.registerPaymentCallback(
            result.checkoutRequestId,
            (callbackResult) => {
              console.log("📞 Payment callback received:", callbackResult);

              if (callbackResult.success) {
                console.log("✅ Payment callback successful, updating UI...");
                setPaymentStep("success");
                setPendingPayment(false);
                setIsProcessing(false);

                // Call onSuccess to update parent component
                console.log("📢 Callback calling onSuccess with:", {
                  plan: callbackResult.plan,
                  endDate: callbackResult.endDate,
                });
                onSuccess(callbackResult.plan, callbackResult.endDate);
              } else {
                console.log(
                  "❌ Payment callback failed:",
                  callbackResult.errorMessage,
                );
                setPendingPayment(false);
                setPaymentStep("ready");
                setIsProcessing(false);
                onError(
                  callbackResult.errorMessage || "Payment failed via callback",
                );
              }
            },
          );
        }

        setIsProcessing(false);
        setPaymentStep("pending");
        setPendingPayment(true);
        // Don't call onSuccess immediately - wait for user confirmation or automatic polling
      } else {
        console.log("❌ Payment was cancelled or failed");
        setIsProcessing(false);
        setPaymentStep("ready");

        if (result.errorMessage) {
          onError(result.errorMessage);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = "Payment processing failed";

      if (error instanceof Error) {
        if (error.message.includes("not available")) {
          errorMessage =
            "Selected payment method is not available. Please try another method.";
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
        return selectedMethod === "tuma"
          ? "SENDING STK PUSH..."
          : "PROCESSING PAYMENT...";
      case "pending":
        return "PAYMENT SENT - CHECK YOUR PHONE";
      case "success":
        return "PAYMENT SUCCESS! 🎉";
      default:
        const price = unifiedPaymentService.getFormattedPrice(selectedMethod);
        return `PAY ${price} / MONTH`;
    }
  };

  const getButtonIcon = () => {
    if (paymentStep === "success") {
      return <CheckIcon className="w-4 h-4" />;
    }

    if (isProcessing) {
      return <Loader />;
    }

    if (plan === "free") {
      return <RocketIcon className="w-4 h-4" />;
    }

    return <LockIcon className="w-4 h-4" />;
  };

  const availableMethods: PaymentMethod[] = (
    ["tuma", "stripe"] as PaymentMethod[]
  ).filter((method) => unifiedPaymentService.isMethodAvailable(method));

  if (availableMethods.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
        <p className="text-sm text-red-400 font-bold">
          ❌ No payment methods configured
        </p>
        <p className="text-xs text-red-500 mt-1">Please contact support</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Recovery Notice */}
      {recoveredPayment.found && (
        <div className="bg-orange-900/20 border border-orange-600/30 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <ClockIcon className="w-5 h-5 text-orange-400" />
            <span className="text-orange-300 font-medium">
              Payment Recovery
            </span>
          </div>
          <p className="text-orange-200 text-sm mb-3">
            Found pending payment for <strong>{recoveredPayment.plan}</strong>{" "}
            plan. If you already paid via M-Pesa, click "Check Payment" below.
          </p>
          <button
            onClick={manualPaymentCheck}
            disabled={isProcessing}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isProcessing ? "Checking..." : "Check Payment Status"}
          </button>
        </div>
      )}

      {/* Payment Method Selection */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <LockIcon className="w-5 h-5 text-blue-400" />
          <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">
            Payment Method
          </h4>
        </div>

        <div className="space-y-3">
          {availableMethods.map((method) => {
            const methodInfo =
              unifiedPaymentService.getPaymentMethodInfo(method);
            if (!methodInfo) return null;

            return (
              <div
                key={method}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMethod === method
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 hover:border-white/20"
                }`}
                onClick={() => setSelectedMethod(method)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{methodInfo.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-white">
                      {methodInfo.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {methodInfo.description}
                    </div>
                  </div>
                  {selectedMethod === method && (
                    <CheckIcon className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone Number Input for M-Pesa */}
      {showPhoneInput && (
        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">📱</span>
            <h4 className="text-sm font-black text-green-400 uppercase tracking-widest">
              M-Pesa Phone Number
            </h4>
          </div>

          <div className="space-y-3">
            <input
              type="tel"
              placeholder="0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
              disabled={isProcessing}
            />
            <p className="text-xs text-green-400">
              Enter your Safaricom M-Pesa phone number (e.g., 0712345678)
            </p>
          </div>
        </div>
      )}

      {/* Payment Details */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-gray-300">Plan</span>
          <span className="text-sm font-black text-white uppercase">
            {plan} Tier
          </span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-gray-300">Price</span>
          <span className="text-sm font-black text-white">
            {unifiedPaymentService.getFormattedPrice(selectedMethod)} / month
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-300">Method</span>
          <span className="text-sm font-black text-blue-400">
            {selectedMethod === "tuma" ? "M-Pesa" : "Credit Card"}
          </span>
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={isProcessing || paymentStep === "success" || pendingPayment}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-2xl ${
          paymentStep === "success"
            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white cursor-not-allowed"
            : pendingPayment
              ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white cursor-not-allowed"
              : isProcessing
                ? "bg-blue-600/50 text-white cursor-wait"
                : plan === "free"
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800"
                  : selectedMethod === "tuma"
                    ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 active:scale-95"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:scale-95"
        }`}
      >
        {getButtonIcon()}
        <span>{getButtonText()}</span>
      </button>

      {/* M-Pesa Payment Pending */}
      {pendingPayment && selectedMethod === "tuma" && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 justify-center">
            <span className="text-orange-400 font-bold text-sm">
              📱 Payment Sent to Your Phone
            </span>
          </div>
          <div className="text-xs text-orange-300 space-y-2 text-center mb-4">
            <p>• Check your phone for the M-Pesa prompt</p>
            <p>• Enter your M-Pesa PIN to complete payment</p>
          </div>
        </div>
      )}

      {/* M-Pesa Instructions */}
      {selectedMethod === "tuma" && !isProcessing && !pendingPayment && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500">📱</span>
            <h5 className="text-xs font-black text-green-400 uppercase tracking-wider">
              M-Pesa Payment Instructions
            </h5>
          </div>
          <div className="text-xs text-green-300 space-y-1">
            <p>• You'll receive an M-Pesa STK push notification</p>
            <p>• Enter your M-Pesa PIN to complete payment</p>
            <p>• Keep your phone nearby during payment</p>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <p className="text-[8px] text-center font-black text-slate-700 uppercase tracking-[0.4em]">
        POWERED BY {selectedMethod === "tuma" ? "TUMA" : "STRIPE"} • SECURE{" "}
        {selectedMethod === "tuma" ? "M-PESA" : "CARD"} PAYMENT
      </p>
    </div>
  );
};

export default UnifiedPayment;

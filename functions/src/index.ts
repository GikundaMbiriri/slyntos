import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Set global options
setGlobalOptions({
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 60,
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface TumaCallbackData {
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

interface PaymentSession {
  merchantRequestId: string;
  checkoutRequestId: string;
  plan: string;
  userId: string;
  userEmail: string;
  amount: number;
  timestamp: number;
  phone: string;
  status: string;
}

/**
 * Simple test endpoint to verify Firebase Functions deployment
 */
export const test = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    logger.info("🧪 Test endpoint called", {
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Firebase Functions is working!",
      timestamp: new Date().toISOString(),
      project: "slyntos-a6cb8",
      region: "us-central1",
    });
  },
);

/**
 * Firebase Cloud Function to handle Tuma M-Pesa payment callbacks
 * This endpoint receives real payment confirmations from Tuma API
 */
export const tumaCallback = onRequest(
  {
    cors: true,
    invoker: "public", // Make this function publicly accessible
  },
  async (req, res) => {
    logger.info("🔔 Tuma M-Pesa callback received", {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    // Only accept POST requests
    if (req.method !== "POST") {
      logger.warn("❌ Invalid request method:", req.method);
      res.status(405).json({
        success: false,
        message: "Method not allowed. Only POST requests accepted.",
      });
      return;
    }

    try {
      const callbackData: TumaCallbackData = req.body;

      // Validate required callback data
      if (
        !callbackData.checkout_request_id ||
        !callbackData.merchant_request_id
      ) {
        logger.error(
          "❌ Invalid callback data - missing required fields",
          callbackData,
        );
        res.status(400).json({
          success: false,
          message: "Invalid callback data",
        });
        return;
      }

      logger.info("✅ Processing Tuma callback:", {
        checkoutRequestId: callbackData.checkout_request_id,
        status: callbackData.status,
        resultCode: callbackData.result_code,
        mpesaReceipt: callbackData.mpesa_receipt_number,
      });

      // Get Firestore reference
      const db = admin.firestore();

      // Look for payment session in Firestore using checkout_request_id
      const sessionQuery = await db
        .collection("payment_sessions")
        .where("checkoutRequestId", "==", callbackData.checkout_request_id)
        .limit(1)
        .get();

      if (sessionQuery.empty) {
        logger.error(
          "❌ No payment session found for checkout_request_id:",
          callbackData.checkout_request_id,
        );
        res.status(404).json({
          success: false,
          message: "Payment session not found",
        });
        return;
      }

      const sessionDoc = sessionQuery.docs[0];
      const session: PaymentSession = sessionDoc.data() as PaymentSession;

      logger.info("📄 Found payment session:", {
        sessionId: sessionDoc.id,
        userEmail: session.userEmail,
        plan: session.plan,
        amount: session.amount,
      });

      // Verify merchant request ID matches
      if (session.merchantRequestId !== callbackData.merchant_request_id) {
        logger.error("❌ Merchant request ID mismatch:", {
          stored: session.merchantRequestId,
          received: callbackData.merchant_request_id,
        });
        res.status(400).json({
          success: false,
          message: "Payment session mismatch",
        });
        return;
      }

      // Process payment result
      if (
        callbackData.status === "completed" &&
        callbackData.result_code === 0
      ) {
        // Payment successful - update user
        logger.info("✅ Payment successful! Updating user:", {
          userEmail: session.userEmail,
          plan: session.plan,
          mpesaReceipt: callbackData.mpesa_receipt_number,
          amount: callbackData.amount,
        });

        try {
          // Find user by email
          const userQuery = await db
            .collection("users")
            .where("email", "==", session.userEmail)
            .limit(1)
            .get();

          if (userQuery.empty) {
            logger.error("❌ User not found for email:", session.userEmail);
            await sessionDoc.ref.delete(); // Clean up session
            res.status(404).json({
              success: false,
              message: "User not found",
            });
            return;
          }

          const userDoc = userQuery.docs[0];

          // Calculate subscription end date (30 days from now)
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          const subscriptionEndDate = Date.now() + thirtyDaysInMs;

          // Update user with new plan and subscription
          await userDoc.ref.update({
            plan: session.plan,
            subscriptionEndDate: subscriptionEndDate,
            lastPayment: {
              transactionId: callbackData.mpesa_receipt_number,
              amount: callbackData.amount || session.amount,
              timestamp: callbackData.timestamp,
              method: "mpesa",
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info("✅ User successfully updated to plan:", session.plan, {
            userId: userDoc.id,
            userEmail: session.userEmail,
            newPlan: session.plan,
            subscriptionEndDate: new Date(subscriptionEndDate).toISOString(),
            mpesaReceipt: callbackData.mpesa_receipt_number,
          });

          // Create payment record for audit trail
          await db.collection("payments").add({
            userId: userDoc.id,
            userEmail: session.userEmail,
            plan: session.plan,
            amount: callbackData.amount || session.amount,
            currency: "KES",
            method: "mpesa",
            status: "completed",
            transactionId: callbackData.mpesa_receipt_number,
            merchantRequestId: callbackData.merchant_request_id,
            checkoutRequestId: callbackData.checkout_request_id,
            tumaTimestamp: callbackData.timestamp,
            resultCode: callbackData.result_code,
            resultDesc: callbackData.result_desc,
            subscriptionEndDate: subscriptionEndDate,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update payment session with completed status (don't delete for polling)
          await sessionDoc.ref.update({
            status: "completed",
            paymentCompleted: true,
            transactionId: callbackData.mpesa_receipt_number,
            M_PesaReceiptNumber: callbackData.mpesa_receipt_number,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionEndDate: subscriptionEndDate,
          });

          logger.info(
            "✅ Payment session updated with completed status for polling",
          );

          res.status(200).json({
            success: true,
            message: "Payment processed successfully",
            data: {
              plan: session.plan,
              endDate: subscriptionEndDate,
              transactionId: callbackData.mpesa_receipt_number,
            },
          });
        } catch (dbError) {
          logger.error("❌ Database update failed:", dbError);
          res.status(500).json({
            success: false,
            message: "Database update failed",
          });
          return;
        }
      } else {
        // Payment failed
        logger.warn("❌ Payment failed:", {
          status: callbackData.status,
          resultCode: callbackData.result_code,
          resultDesc: callbackData.result_desc,
          failureReason: callbackData.failure_reason,
          userEmail: session.userEmail,
        });

        // Create failed payment record
        await db.collection("payments").add({
          userId: session.userId,
          userEmail: session.userEmail,
          plan: session.plan,
          amount: session.amount,
          currency: "KES",
          method: "mpesa",
          status: "failed",
          merchantRequestId: callbackData.merchant_request_id,
          checkoutRequestId: callbackData.checkout_request_id,
          tumaTimestamp: callbackData.timestamp,
          resultCode: callbackData.result_code,
          resultDesc: callbackData.result_desc,
          failureReason: callbackData.failure_reason,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update payment session with failed status (don't delete for polling)
        await sessionDoc.ref.update({
          status: "failed",
          paymentFailed: true,
          failureReason:
            callbackData.failure_reason || callbackData.result_desc,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(
          "❌ Payment session updated with failed status for polling",
        );

        res.status(200).json({
          success: false,
          message:
            callbackData.failure_reason ||
            callbackData.result_desc ||
            "Payment failed",
          data: {
            reason: callbackData.failure_reason || callbackData.result_desc,
          },
        });
      }
    } catch (error) {
      logger.error("❌ Error processing Tuma callback:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error processing payment callback",
      });
    }
  },
);

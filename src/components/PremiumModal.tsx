import React, { useState } from "react";
import XCircleIcon from "./icons/XCircleIcon";
import CheckIcon from "./icons/CheckIcon";
import RocketIcon from "./icons/RocketIcon";
import SparklesIcon from "./icons/SparklesIcon";
import LockIcon from "./icons/LockIcon";
import { UserPlan } from "../types";
import Loader from "./Loader";
import { ACTIVATION_CODES } from "../constants";
import UnifiedPayment from "./UnifiedPayment";

interface PremiumModalProps {
  onClose: () => void;
  onSuccess: (plan: UserPlan, endDate: number) => void;
  currentUser: {
    id: string;
    email: string;
    username: string;
  };
}

const PLANS = [
  {
    id: "free" as UserPlan,
    name: "Free Mission",
    price: "0.00",
    features: [
      "20 Missions / Day",
      "5 Image Generations",
      "1 Web Studio Usage",
      "1 Slyntos Edu Chat",
      "0 Video Generations",
    ],
    color: "from-slate-600 to-slate-800",
  },
  {
    id: "pro" as UserPlan,
    name: "Pro Operator",
    price: "10.00",
    features: [
      "Unlimited Missions",
      "Unlimited Image Generations",
      "Unlimited Web Studio",
      "Unlimited Slyntos Edu",
      "1 Video Generation / Month",
    ],
    color: "from-blue-600 to-indigo-600",
  },
];

const PremiumModal: React.FC<PremiumModalProps> = ({
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0]>(PLANS[1]); // Default to $10 plan
  const [accessCode, setAccessCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"selection" | "success">(
    "selection",
  );
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "code">(
    "stripe",
  );

  const handleActivate = async () => {
    if (selectedPlan.id === "free") {
      onClose();
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Artificial delay for "neural verification" feel
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const expectedCode = (ACTIVATION_CODES as any)[selectedPlan.id];

    if (accessCode === expectedCode) {
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const endDate = Date.now() + thirtyDaysInMs;

      setIsProcessing(false);
      setPaymentStep("success");
      onSuccess(selectedPlan.id, endDate);
    } else {
      setIsProcessing(false);
      setError("Invalid Access Code. Verification Failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in overflow-auto">
      <div className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] my-4">
        {/* Left Side: Value Proposition */}
        <div className="md:w-4/12 p-6 md:p-8 bg-gradient-to-b from-blue-600/10 to-transparent border-r border-white/5 flex flex-col overflow-y-auto">
          <div className="mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              <SparklesIcon className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">
              Upgrade Engine
            </h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-1">
              Select Your Tier
            </p>
          </div>

          <div className="space-y-4 flex-1">
            {selectedPlan.features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                  <CheckIcon className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-xs font-bold text-slate-300 tracking-tight">
                  {f}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[9px] text-slate-500 uppercase font-black leading-relaxed">
              Global mission protocol active. Each tier unlocks significantly
              deeper neural pathways and synthesis speed via manual activation
              codes.
            </p>
          </div>
        </div>

        {/* Right Side: Plans & Activation */}
        <div className="md:w-8/12 p-6 md:p-8 flex flex-col overflow-y-auto max-h-full">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-600 hover:text-white transition-all active:scale-90"
          >
            <XCircleIcon className="w-8 h-8" />
          </button>

          {paymentStep === "selection" ? (
            <>
              <div className="mb-6 text-center md:text-left">
                <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">
                  Mission Quota Configuration
                </h3>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">
                  Four tiers of universal intelligence
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setError(null);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                      selectedPlan.id === plan.id
                        ? "bg-white border-white shadow-2xl scale-[1.02]"
                        : "bg-white/5 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                      <RocketIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p
                        className={`text-[9px] font-black uppercase tracking-widest truncate ${selectedPlan.id === plan.id ? "text-black/40" : "text-slate-600"}`}
                      >
                        {plan.name}
                      </p>
                      <p
                        className={`text-sm font-black ${selectedPlan.id === plan.id ? "text-black" : "text-white"}`}
                      >
                        $ {plan.price}
                      </p>
                    </div>
                    {selectedPlan.id === plan.id && (
                      <div className="ml-auto w-5 h-5 bg-black rounded-full flex items-center justify-center">
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-4 flex-shrink-0">
                {selectedPlan.id !== "free" && (
                  <div className="space-y-4">
                    {/* Payment Method Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod("stripe")}
                          className={`p-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                            paymentMethod === "stripe"
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                              : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                          }`}
                        >
                          💳 Card / M-Pesa
                        </button>
                        {/* <button
                          onClick={() => setPaymentMethod("code")}
                          className={`p-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                            paymentMethod === "code"
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                              : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                          }`}
                        >
                          🔑 Access Code
                        </button> */}
                      </div>
                    </div>

                    {/* Payment Form */}
                    {paymentMethod === "stripe" ? (
                      <UnifiedPayment
                        plan={selectedPlan.id}
                        userId={currentUser.id}
                        userEmail={currentUser.email}
                        userName={currentUser.username}
                        onSuccess={onSuccess}
                        onError={(error) => setError(error)}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                            <LockIcon className="w-3 h-3" /> Access Code
                            Verification
                          </label>
                          <input
                            type="text"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="Enter 8-digit Activation Code"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono tracking-[0.5em] text-center focus:border-blue-500 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-800"
                          />
                        </div>

                        <button
                          onClick={handleActivate}
                          disabled={isProcessing || !accessCode.trim()}
                          className={`w-full py-5 rounded-2xl font-black uppercase italic tracking-[0.3em] text-[11px] transition-all flex items-center justify-center gap-3 ${
                            isProcessing
                              ? "bg-slate-800 text-slate-500"
                              : "bg-white text-black hover:bg-slate-100 active:scale-95 shadow-2xl"
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader /> VERIFYING PROTOCOL
                            </>
                          ) : (
                            "ACTIVATE PROTOCOL"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedPlan.id === "free" && (
                  <button
                    onClick={() => onSuccess("free", 0)}
                    className="w-full py-5 rounded-2xl font-black uppercase italic tracking-[0.3em] text-[11px] transition-all flex items-center justify-center gap-3 bg-white text-black hover:bg-slate-100 active:scale-95 shadow-2xl"
                  >
                    CONTINUE FREE
                  </button>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                      {error}
                    </p>
                  </div>
                )}

                <p className="text-[8px] text-center font-black text-slate-700 uppercase tracking-[0.4em]">
                  NEURAL SECURITY ENCRYPTED
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce">
                <CheckIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-2">
                Protocol Enhanced
              </h3>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-8 italic">
                Apex Level Synthesis Ready
              </p>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl max-w-xs mx-auto">
                <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                  Your mission profile has been successfully upgraded to{" "}
                  <span className="font-black uppercase tracking-widest">
                    {selectedPlan.name}
                  </span>{" "}
                  status.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-10 px-10 py-3 bg-white text-black font-black uppercase italic tracking-[0.2em] rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-[10px]"
              >
                Return to Mission Control
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;

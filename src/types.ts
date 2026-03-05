export interface Source {
  uri: string;
  title: string;
}

export interface Message {
  role: "user" | "model";
  content: string;
  images?: string[];
  videoUrl?: string;
  videoScript?: any; // Added for local video synthesis
  audioUrl?: string;
  sources?: Source[];
  files?: FileData[];
  rawHtml?: string;
}

export interface FileData {
  name: string;
  type: string;
  data: string;
  size: number;
}

export enum Page {
  General = "General Chat",
  Edu = "Slyntos Edu",
  WebStudio = "Slyntos Web Studio",
  Studio = "Slyntos Studio",
  Enterprise = "Enterprise",
}

export type UserPlan = "free" | "pro";

export interface PaymentSubscription {
  id: string;
  status: "active" | "canceled" | "past_due" | "incomplete";
  currentPeriodStart: number;
  currentPeriodEnd: number;
  customerId: string;
  priceId: string;
  plan: UserPlan;
}

export interface PaymentSession {
  sessionId: string;
  status: "pending" | "completed" | "failed";
  plan: UserPlan;
  amount: number;
  createdAt: number;
}

export interface GenConfig {
  temperature: number;
  topP: number;
  topK: number;
  systemInstructionOverride?: string;
  safetySettings?: {
    harassment: "BLOCK_NONE" | "BLOCK_ONLY_HIGH" | "BLOCK_MEDIUM_AND_ABOVE";
    hate: "BLOCK_NONE" | "BLOCK_ONLY_HIGH" | "BLOCK_MEDIUM_AND_ABOVE";
    sexual: "BLOCK_NONE" | "BLOCK_ONLY_HIGH" | "BLOCK_MEDIUM_AND_ABOVE";
    dangerous: "BLOCK_NONE" | "BLOCK_ONLY_HIGH" | "BLOCK_MEDIUM_AND_ABOVE";
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  profilePicture?: string;
  plan: UserPlan;
  subscriptionEndDate?: number;
  lastUsageReset?: number;
  usageCounts: {
    [Page.Edu]: number;
    [Page.WebStudio]: number;
    [Page.Studio]: number;
    images: number;
    global?: number;
  };
  globalGenConfig?: GenConfig;
  // Payment-related fields
  customerId?: string; // Stripe customer ID
  subscription?: PaymentSubscription;
  paymentHistory?: PaymentSession[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
  sessionConfig?: GenConfig;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

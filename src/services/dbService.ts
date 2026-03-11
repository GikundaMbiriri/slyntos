// Firebase Firestore Database Service
import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from "firebase/firestore";
import type { User, ChatSession, Page } from "../types";

// Collection names
const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "chat-sessions";

export const addUser = async (user: User): Promise<void> => {
  try {
    // Use the user ID as the document ID for easy retrieval
    await setDoc(doc(db, USERS_COLLECTION, user.id), {
      ...user,
      username_lower: user.username.toLowerCase(),
      email_lower: user.email.toLowerCase(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error adding user:", error);
    throw new Error("Failed to add user to database");
  }
};

export const updateUser = async (user: User): Promise<void> => {
  try {
    await setDoc(
      doc(db, USERS_COLLECTION, user.id),
      {
        ...user,
        username_lower: user.username.toLowerCase(),
        email_lower: user.email.toLowerCase(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user in database");
  }
};

export const getUserByUsername = async (
  username: string,
): Promise<User | undefined> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("username_lower", "==", username.toLowerCase()),
      firestoreLimit(1),
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return undefined;
    }

    const doc = querySnapshot.docs[0];
    const userData = doc.data() as User;
    return userData;
  } catch (error) {
    console.error("Error getting user by username:", error);
    return undefined;
  }
};

export const getUserByEmail = async (
  email: string,
): Promise<User | undefined> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("email_lower", "==", email.toLowerCase()),
      firestoreLimit(1),
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return undefined;
    }

    const doc = querySnapshot.docs[0];
    const userData = doc.data() as User;
    return userData;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return undefined;
  }
};

// Helper function to clean undefined values from objects
const cleanObject = (obj: any): any => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === "object" && item !== null ? cleanObject(item) : item,
        );
      } else if (typeof value === "object" && value !== null) {
        cleaned[key] = cleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

export const saveChatSession = async (
  session: ChatSession,
  userId: string,
  page: Page,
): Promise<void> => {
  try {
    // Clean undefined values from session data
    const cleanSession = {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      messages: (session.messages || []).map((msg) => cleanObject(msg)),
      userId,
      page,
      createdAtTimestamp: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Only include sessionConfig if it's defined
    if (session.sessionConfig) {
      (cleanSession as any).sessionConfig = cleanObject(session.sessionConfig);
    }

    await setDoc(doc(db, SESSIONS_COLLECTION, session.id), cleanSession);
  } catch (error) {
    console.error("Error saving chat session:", error);
    throw new Error("Failed to save chat session");
  }
};

export const getAllChatSessionsForPage = async (
  userId: string,
  page: Page,
): Promise<ChatSession[]> => {
  try {
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where("userId", "==", userId),
      where("page", "==", page),
      orderBy("createdAt", "desc"),
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Remove Firebase-specific fields and return clean ChatSession
      const {
        userId: _,
        page: __,
        createdAtTimestamp,
        updatedAt,
        ...session
      } = data;
      return session as ChatSession;
    });
  } catch (error) {
    console.error("Error getting chat sessions:", error);
    return [];
  }
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
  } catch (error) {
    console.error("Error deleting chat session:", error);
    throw new Error("Failed to delete chat session");
  }
};

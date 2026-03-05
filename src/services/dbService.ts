
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { User, ChatSession, Page } from '../types';

const DB_NAME = 'slyntos-ai-db';
const DB_VERSION = 2; 
const USERS_STORE = 'users';
const SESSIONS_STORE = 'chat-sessions';

interface SlyntosDB extends DBSchema {
  [USERS_STORE]: {
    key: string;
    value: User & { username_lower: string; email_lower: string };
    indexes: { 
      'username_lower': string;
      'email_lower': string;
    };
  };
  [SESSIONS_STORE]: {
    key: string;
    value: ChatSession & { userId: string; page: Page };
    indexes: { 'user_page_date': [string, Page, number] };
  };
}

let dbPromise: Promise<IDBPDatabase<SlyntosDB>>;

const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<SlyntosDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        let usersStore;
        
        if (oldVersion < 1) {
          usersStore = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
          usersStore.createIndex('username_lower', 'username_lower', { unique: true });
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('user_page_date', ['userId', 'page', 'createdAt'], { unique: false });
        } else {
          usersStore = transaction.objectStore(USERS_STORE);
        }

        if (oldVersion < 2) {
          if (!usersStore.indexNames.contains('email_lower')) {
            usersStore.createIndex('email_lower', 'email_lower', { unique: true });
          }
        }
      },
    });
  }
  return dbPromise;
};

export const addUser = async (user: User): Promise<void> => {
  const db = await initDB();
  const userWithIndex = { 
    ...user, 
    username_lower: user.username.toLowerCase(),
    email_lower: user.email.toLowerCase()
  };
  await db.add(USERS_STORE, userWithIndex as any);
};

export const updateUser = async (user: User): Promise<void> => {
  const db = await initDB();
  const userWithIndex = { 
    ...user, 
    username_lower: user.username.toLowerCase(),
    email_lower: user.email.toLowerCase()
  };
  await db.put(USERS_STORE, userWithIndex as any);
};

export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  const db = await initDB();
  return db.getFromIndex(USERS_STORE, 'username_lower', username.toLowerCase());
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const db = await initDB();
  return db.getFromIndex(USERS_STORE, 'email_lower', email.toLowerCase());
};

export const saveChatSession = async (session: ChatSession, userId: string, page: Page): Promise<void> => {
    const db = await initDB();
    const sessionToIndex = { ...session, userId, page };
    await db.put(SESSIONS_STORE, sessionToIndex as any);
};

export const getAllChatSessionsForPage = async (userId: string, page: Page): Promise<ChatSession[]> => {
    const db = await initDB();
    const range = IDBKeyRange.bound([userId, page, -Infinity], [userId, page, Infinity]);
    const sessions = await db.getAllFromIndex(SESSIONS_STORE, 'user_page_date', range);
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
    const db = await initDB();
    await db.delete(SESSIONS_STORE, sessionId);
};

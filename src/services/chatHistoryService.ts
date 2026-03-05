import type { Page, ChatSession } from '../types';
import { 
    getAllChatSessionsForPage, 
    saveChatSession as dbSaveSession,
    deleteChatSession as dbDeleteSession
} from './dbService';

export const getAllSessions = async (userId: string, page: Page): Promise<ChatSession[]> => {
  return await getAllChatSessionsForPage(userId, page);
};

export const saveSession = async (userId: string, page: Page, session: ChatSession): Promise<void> => {
  await dbSaveSession(session, userId, page);
};

export const deleteSession = async (userId: string, page: Page, sessionId: string): Promise<ChatSession[]> => {
    await dbDeleteSession(sessionId);
    // Return the updated list of sessions
    return await getAllChatSessionsForPage(userId, page);
};
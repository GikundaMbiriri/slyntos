
import { User, Page } from '../types';
import { addUser, getUserByUsername, getUserByEmail, updateUser } from './dbService';
import { cloudSync } from './cloudService';

export const register = async (email: string, username: string, password: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500));

  const existingEmail = await getUserByEmail(email);
  if (existingEmail) throw new Error('Email already registered.');

  const existingUser = await getUserByUsername(username);
  if (existingUser) throw new Error('Username already exists.');

  const hashedPassword = btoa(password);

  const newUser: User = {
    id: `user_${Date.now()}`,
    email,
    username,
    password: hashedPassword,
    plan: 'free',
    usageCounts: {
      [Page.Edu]: 0,
      [Page.WebStudio]: 0,
      [Page.Studio]: 0,
      images: 0,
      global: 0
    }
  };

  await addUser(newUser);
  await cloudSync.pushProfile(newUser);

  const { password: _, ...userToReturn } = newUser;
  return userToReturn;
};

export const login = async (usernameOrEmail: string, password: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try both username and email lookups
  let userRecord = await getUserByUsername(usernameOrEmail);
  if (!userRecord) {
      userRecord = await getUserByEmail(usernameOrEmail);
  }

  // If not local, try cloud
  if (!userRecord) {
      const globalProfile = await cloudSync.pullProfile(usernameOrEmail);
      if (globalProfile) {
          userRecord = globalProfile;
          await addUser(userRecord); // Sync to local
      }
  }

  if (!userRecord || !userRecord.password) {
    throw new Error('Invalid credentials.');
  }
  
  let decodedPassword;
  try {
      decodedPassword = atob(userRecord.password);
  } catch (e) {
      throw new Error("Invalid credentials.");
  }

  if (decodedPassword !== password) {
    throw new Error('Invalid credentials.');
  }
  
  const { password: _, ...userToReturn } = userRecord;
  if (!userToReturn.plan) userToReturn.plan = 'free';
  if (!userToReturn.usageCounts) {
    userToReturn.usageCounts = { [Page.Edu]: 0, [Page.WebStudio]: 0, [Page.Studio]: 0, images: 0, global: 0 };
  }
  
  return userToReturn;
};

export const googleSignIn = async (selectedProfile: { email: string, name: string, picture?: string }): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const globalProfile = await cloudSync.pullProfile(selectedProfile.email);
    
    if (globalProfile) {
        await updateUser(globalProfile);
        return globalProfile;
    }

    const localUser = await getUserByEmail(selectedProfile.email);
    if (localUser) return localUser;

    const newUser: User = {
        id: `user_google_${Date.now()}`,
        email: selectedProfile.email,
        username: selectedProfile.name.replace(/\s/g, '_'),
        plan: 'free',
        profilePicture: selectedProfile.picture || `https://ui-avatars.com/api/?name=${selectedProfile.name}&background=random`,
        usageCounts: { [Page.Edu]: 0, [Page.WebStudio]: 0, [Page.Studio]: 0, images: 0, global: 0 }
    };
    
    await addUser(newUser);
    await cloudSync.pushProfile(newUser); 
    return newUser;
};

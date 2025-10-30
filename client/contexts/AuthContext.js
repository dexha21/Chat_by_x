import React, { createContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useChatDb } from '../components/public/hooks/useChatDb';

export const AuthContext = createContext();

const TOKEN_KEY = 'auth_token';
const USER_NAME = 'user-name';
const USER_EMAIL = 'user-email';
const USER_ID = 'user-id';

const setItem = async (key, value) => {
  if (typeof value !== "string") {
    value = JSON.stringify(value);
  }

  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};
 

const getItem = async (key) => {
  let value;
  if (Platform.OS === 'web') {
    value = localStorage.getItem(key);
  } else {
    value = await SecureStore.getItemAsync(key);
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};


const deleteItem = async (key) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userID, setUserID] = useState(null);
  const [wait, setWait] = useState(true);

  const { isReady, clearClientContact, clearClientMessages } = useChatDb()

  useEffect(() => {
    const loadUser = async () => {
      const token = await getItem(TOKEN_KEY);
      const email = await getItem(USER_EMAIL);
      const name = await getItem(USER_NAME);
      const id = await getItem(USER_ID);

      if (token) {
        setAuthToken(token);
        setUserEmail(email);
        setUserName(name);
        setUserID(id);
      }

      setWait(false);
    };
    loadUser();
  }, []);

  const saveUser = async (token, name, email, user_id) => {
    await Promise.all([
      setItem(TOKEN_KEY, token),
      setItem(USER_EMAIL, email),
      setItem(USER_NAME, name),
      setItem(USER_ID, user_id)
    ]);
    setAuthToken(token);
    setUserEmail(email);
    setUserName(name);
    setUserID(user_id);
  };

  const removeUser = async () => {
    await deleteItem(TOKEN_KEY);
    await deleteItem(USER_EMAIL);
    await deleteItem(USER_NAME);
    await deleteItem(USER_ID);
    setAuthToken(null);
    setUserEmail(null);
    setUserName(null);
    setUserID(null);
    if (isReady) {
      clearClientContact()
      clearClientMessages()
    }
  };

  return (
    <AuthContext.Provider value={{
      token: authToken,
      name: userName,
      email: userEmail,
      userid: userID,
      isAuthenticated: !!authToken,
      wait,
      setUser: saveUser,
      removeUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

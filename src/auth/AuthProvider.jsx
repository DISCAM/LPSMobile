import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthContext } from "./AuthContext";
import { getMeRequest, loginRequest } from "../api/authApi";

const TOKEN_KEY = "lps_token";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (!savedToken) {
          return;
        }

        const userData = await getMeRequest(savedToken);

        setToken(savedToken);
        setUser(userData);
      } catch (error) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);

        setToken(null);
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const loginResult = await loginRequest(email, password);

    await SecureStore.setItemAsync(TOKEN_KEY, loginResult.token);

    const userData = await getMeRequest(loginResult.token);

    setToken(loginResult.token);
    setUser(userData);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);

    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    isAuthLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

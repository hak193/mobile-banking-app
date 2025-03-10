import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Replace with actual API endpoint
      const response = await axios.post('https://api.bankingapp.azure.com/auth/login', {
        email,
        password,
      });
      
      const { token, userData } = response.data;
      await AsyncStorage.setItem('userToken', token);
      setUser(userData);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Replace with actual API endpoint
      const response = await axios.post('https://api.bankingapp.azure.com/auth/register', userData);
      
      const { token, user: newUser } = response.data;
      await AsyncStorage.setItem('userToken', token);
      setUser(newUser);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // TODO: Replace with actual API endpoint
        const response = await axios.get('https://api.bankingapp.azure.com/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        register,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

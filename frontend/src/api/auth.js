import api from "./index.js";

export const authAPI = {
  // Login user
  login: async (credentials) => {
    return api.post("/auth/login", credentials);
  },

  // Register new user
  register: async (userData) => {
    // Combine firstName and lastName into a single name field
    const formattedData = {
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      password: userData.password,
    };
    return api.post("/users", formattedData); // Change from "/auth/register" to "/users"
  },

  // Logout user
  logout: async () => {
    return api.get("/auth/logout");
  },

  // Refresh token
  refreshToken: async () => {
    return api.post("/auth/refresh");
  },

  // Forgot password
  forgotPassword: async (email) => {
    return api.post("/auth/forgot-password", { email });
  },

  // Reset password
  resetPassword: async (token, password) => {
    return api.post("/auth/reset-password", { token, password });
  },

  // Verify email
  verifyEmail: async (token) => {
    return api.post("/auth/verify-email", { token });
  },

  // Get current user
  getCurrentUser: async () => {
    return api.get("/auth/me");
  },

  // Update password
  updatePassword: async (passwordData) => {
    return api.put("/auth/update-password", passwordData);
  },
};

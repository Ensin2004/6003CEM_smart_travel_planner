/**
 * API wrapper for authentication endpoints.
 * Keeping endpoint strings here keeps page components focused on form state and user feedback.
 */
import axiosClient from './axiosClient';

// Submits user credentials to authenticate and establish a session
export const login = (payload) => axiosClient.post('/auth/login', payload);

// Submits new user registration data to create an account
export const register = (payload) => axiosClient.post('/auth/register', payload);

// Requests a new access token using a valid refresh token
export const refreshSession = (payload) => axiosClient.post('/auth/refresh', payload);

// Terminates the current user session and invalidates tokens
export const logoutSession = (payload) => axiosClient.post('/auth/logout', payload);

// Submits email verification token to confirm user email address
export const verifyEmail = (payload) => axiosClient.post('/auth/verify-email', payload);

// Requests a new email verification link to be sent to the user
export const resendVerificationEmail = (payload) => axiosClient.post('/auth/verify-email/resend', payload);

// Sends an email address to check if a password reset is possible
export const checkPasswordResetEmail = (payload) => axiosClient.post('/auth/forgot-password/check-email', payload);

// Submits new password and reset token to complete password change
export const resetPassword = (payload) => axiosClient.post('/auth/forgot-password/reset', payload);
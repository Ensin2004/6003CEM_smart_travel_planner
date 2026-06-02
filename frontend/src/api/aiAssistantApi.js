/**
 * AI Assistant Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

export const sendAiChatPrompt = ({ prompt, page }) =>
  axiosClient.post('/ai/chat', {
    prompt,
    page,
  });

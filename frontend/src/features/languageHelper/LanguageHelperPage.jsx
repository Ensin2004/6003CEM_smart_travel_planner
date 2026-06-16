/**
 * Language Helper module.
 * Page state, event handlers, and render sections define the screen experience.
 */

// ============================================================
// IMPORTS
// ============================================================

import {
  ArrowRightLeft,
  Clipboard,
  History,
  Languages,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteLanguageHelperHistory,
  getLanguageHelperHistory,
  getLanguageHelperLanguages,
  translateLanguageHelperText,
} from '../../api/languageApi';
import { phraseSuggestions } from './languageHelper.constants';
import {
  formatHistoryDate,
  getBrowserSpeechCode,
  getFriendlyApiError,
  getLanguageByCode,
  getSpeechRecognition,
} from './languageHelper.utils';
import './LanguageHelperPage.css';

// ============================================================
// COMPONENT DEFINITION
// ============================================================

/**
 * LanguageHelperPage renders the main translation interface.
 * Handles language selection, text translation, speech recognition,
 * text-to-speech playback, and translation history management.
 */
function LanguageHelperPage() {
  // ============================================================
  // STATE DECLARATIONS
  // ============================================================

  // Language data from the API
  const [languages, setLanguages] = useState([]);
  
  // Selected language codes for source and target
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  
  // Text content for source and translated output
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  
  // History data and search/filter controls
  const [historyItems, setHistoryItems] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPagination, setHistoryPagination] = useState({ 
    page: 1, 
    limit: 8, 
    total: 0, 
    totalPages: 0 
  });
  
  // Loading states for async operations
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  // Feedback messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ============================================================
  // COMPUTED VALUES (Memoized)
  // ============================================================

  /**
   * Retrieves the full language object for the selected source language.
   * Returns the matching language or null if not found.
   */
  const selectedSourceLanguage = useMemo(
    () => getLanguageByCode(languages, sourceLanguage),
    [languages, sourceLanguage]
  );

  /**
   * Retrieves the full language object for the selected target language.
   * Returns the matching language or null if not found.
   */
  const selectedTargetLanguage = useMemo(
    () => getLanguageByCode(languages, targetLanguage),
    [languages, targetLanguage]
  );

  /**
   * Feature detection flags for browser capabilities.
   * Determines if speech recognition and speech synthesis are supported.
   */
  const recognitionSupported = typeof window !== 'undefined' && Boolean(getSpeechRecognition());
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasLanguages = languages.length > 0;

  // ============================================================
  // HISTORY LOADING FUNCTION
  // ============================================================

  /**
   * Loads translation history from the API with pagination and search support.
   * Updates the history items and pagination state on success.
   * Handles errors gracefully by clearing the history list.
   * 
   * @param {number} nextPage - The page number to load (defaults to 1)
   * @param {string} search - Optional search query to filter history
   * @returns {Promise} A promise that resolves when history is loaded
   */
  const loadHistory = useCallback((nextPage = 1, search = historySearch) => {
    setIsLoadingHistory(true);

    return getLanguageHelperHistory({ 
      page: nextPage, 
      limit: historyPagination.limit, 
      search 
    })
      .then((response) => {
        const history = response.data?.data?.history;
        setHistoryItems(history?.items || []);
        setHistoryPagination(
          history?.pagination || { 
            page: nextPage, 
            limit: 8, 
            total: 0, 
            totalPages: 0 
          }
        );
      })
      .catch(() => {
        setHistoryItems([]);
      })
      .finally(() => setIsLoadingHistory(false));
  }, [historyPagination.limit, historySearch]);

  // ============================================================
  // EFFECT: LOAD LANGUAGES ON MOUNT
  // ============================================================

  /**
   * Fetches available languages from the API when the component mounts.
   * Sets default source language to English (or first available).
   * Sets default target language to the first non-English language (or second available).
   * Cleans up speech recognition and synthesis on unmount.
   */
  useEffect(() => {
    let isMounted = true;

    getLanguageHelperLanguages()
      .then((response) => {
        const nextLanguages = response.data?.data?.languages || [];
        const message = response.data?.data?.message;

        if (!isMounted) return;

        setLanguages(nextLanguages);
        
        // Set default source language: English if available, otherwise first language
        setSourceLanguage(
          nextLanguages.find((language) => language.code === 'en')?.code || 
          nextLanguages[0]?.code || 
          ''
        );
        
        // Set default target language: first non-English language, otherwise second or first
        setTargetLanguage(
          nextLanguages.find((language) => language.code !== 'en')?.code || 
          nextLanguages[1]?.code || 
          nextLanguages[0]?.code || 
          ''
        );

        if (message) {
          setErrorMessage(message);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage('Language options could not be loaded. Please try again later.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingLanguages(false);
        }
      });

    // Cleanup prevents state updates after component unmount
    return () => {
      isMounted = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ============================================================
  // EFFECT: LOAD HISTORY ON MOUNT
  // ============================================================

  /**
   * Loads the initial translation history when the component mounts.
   * Fetches the first page of history with default pagination settings.
   * Handles errors by setting an empty history list.
   */
  useEffect(() => {
    let isMounted = true;

    getLanguageHelperHistory({ page: 1, limit: 8 })
      .then((response) => {
        if (!isMounted) return;

        const history = response.data?.data?.history;
        setHistoryItems(history?.items || []);
        setHistoryPagination(
          history?.pagination || { 
            page: 1, 
            limit: 8, 
            total: 0, 
            totalPages: 0 
          }
        );
      })
      .catch(() => {
        if (isMounted) {
          setHistoryItems([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      });

    // Cleanup prevents state updates after component unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================
  // HANDLER: TRANSLATE TEXT
  // ============================================================

  /**
   * Handles the translation form submission.
   * Validates input, calls the translation API, and updates the output.
   * Reloads history after successful translation to show the new entry.
   * 
   * @param {Event} event - The form submission event
   */
  const handleTranslate = async (event) => {
    event?.preventDefault();
    
    const trimmedText = sourceText.trim();
    
    // Validation: Check if languages are available
    if (!hasLanguages) {
      setErrorMessage('Language options are not available yet.');
      setSuccessMessage('');
      return;
    }
    
    // Validation: Check if source text is provided
    if (!trimmedText) {
      setErrorMessage('Enter or record a phrase before translating.');
      setSuccessMessage('');
      return;
    }

    setIsTranslating(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await translateLanguageHelperText({
        sourceLanguage,
        targetLanguage,
        text: trimmedText,
      });
      
      const translation = response.data?.data?.translation;

      // Check if translation is available
      if (!translation?.available) {
        setTranslatedText('');
        setErrorMessage(translation?.message || 'Translation temporarily unavailable.');
        return;
      }

      // Update output and show success message
      setTranslatedText(translation.translatedText);
      setSuccessMessage(
        translation.cached 
          ? 'Translated from recent cache and saved to history.' 
          : 'Translation saved to history.'
      );
      
      // Reload history to include the new translation
      loadHistory(1);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, 'Translation failed. Please try again.'));
      setTranslatedText('');
    } finally {
      setIsTranslating(false);
    }
  };

  // ============================================================
  // HANDLER: SPEECH RECOGNITION (Listen)
  // ============================================================

  /**
   * Toggles speech recognition listening state.
   * Starts recording when not listening, stops when currently listening.
   * Uses the browser's SpeechRecognition API to convert speech to text.
   * Sets the recognized text into the source text field.
   */
  const handleListen = () => {
    setErrorMessage('');
    setSuccessMessage('');

    // Feature detection: Check if speech recognition is supported
    if (!recognitionSupported) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    // Validation: Ensure a source language is selected
    if (!selectedSourceLanguage) {
      setErrorMessage('Select a speaking language before recording.');
      return;
    }

    // Stop recording if currently listening
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = getSpeechRecognition();
    const recognition = new SpeechRecognition();
    recognition.lang = getBrowserSpeechCode(selectedSourceLanguage.code);
    recognition.continuous = false;
    recognition.interimResults = true;

    // Event handlers for recognition lifecycle
    recognition.onstart = () => setIsListening(true);
    
    recognition.onerror = () => {
      setIsListening(false);
      setErrorMessage('Speech could not be recognized. Check microphone permission and selected language.');
    };
    
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      setSourceText(transcript);
    };

    // Store reference and start recognition
    recognitionRef.current = recognition;
    recognition.start();
  };

  // ============================================================
  // HANDLER: TEXT-TO-SPEECH (Speak)
  // ============================================================

  /**
   * Reads the translated text aloud using browser speech synthesis.
   * Uses the target language code for proper pronunciation.
   * Cancels any ongoing speech before starting new playback.
   */
  const handleSpeak = () => {
    // Feature detection: Check if speech synthesis is supported
    if (!speechSupported) {
      setErrorMessage('Text to speech is not supported in this browser.');
      return;
    }

    const textToRead = translatedText.trim();

    // Validation: Ensure text and target language are available
    if (!textToRead || !selectedTargetLanguage) {
      setErrorMessage('Translate a phrase before playing audio.');
      return;
    }

    // Cancel any ongoing speech and start new utterance
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = getBrowserSpeechCode(selectedTargetLanguage.code);
    window.speechSynthesis.speak(utterance);
  };

  // ============================================================
  // HANDLER: SWAP LANGUAGES
  // ============================================================

  /**
   * Swaps the source and target languages and exchanges their text content.
   * Useful for translating in the opposite direction.
   * Clears feedback messages after swapping.
   */
  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // ============================================================
  // HANDLER: COPY TRANSLATION
  // ============================================================

  /**
   * Copies the translated text to the clipboard using the Clipboard API.
   * Shows success or error feedback based on the operation result.
   */
  const handleCopyTranslation = async () => {
    if (!translatedText.trim()) {
      setErrorMessage('No translated text to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(translatedText);
      setSuccessMessage('Translated phrase copied.');
      setErrorMessage('');
    } catch {
      setErrorMessage('Copy failed. Select the text manually.');
    }
  };

  // ============================================================
  // HANDLER: CLEAR ALL
  // ============================================================

  /**
   * Clears all text inputs, translation output, and feedback messages.
   * Stops any ongoing speech recognition or text-to-speech playback.
   */
  const handleClear = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setSourceText('');
    setTranslatedText('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // ============================================================
  // HANDLER: HISTORY SEARCH
  // ============================================================

  /**
   * Handles the history search form submission.
   * Reloads history with the current search query starting from page 1.
   * 
   * @param {Event} event - The form submission event
   */
  const handleHistorySearch = (event) => {
    event.preventDefault();
    loadHistory(1, historySearch);
  };

  // ============================================================
  // HANDLER: LOAD HISTORY ITEM
  // ============================================================

  /**
   * Loads a history item into the translation interface.
   * Sets the source and target languages and populates the text fields.
   * Useful for reusing previous translations.
   * 
   * @param {Object} item - The history item to load
   */
  const handleUseHistory = (item) => {
    setSourceLanguage(item.sourceLanguage?.code || sourceLanguage);
    setTargetLanguage(item.targetLanguage?.code || targetLanguage);
    setSourceText(item.sourceText);
    setTranslatedText(item.translatedText);
    setErrorMessage('');
    setSuccessMessage('History item loaded.');
  };

  // ============================================================
  // HANDLER: DELETE HISTORY ITEM
  // ============================================================

  /**
   * Deletes a single history item by ID.
   * Reloads the current history page after successful deletion.
   * 
   * @param {string|number} id - The ID of the history item to delete
   */
  const handleDeleteHistory = async (id) => {
    try {
      await deleteLanguageHelperHistory(id);
      setSuccessMessage('History item deleted.');
      setErrorMessage('');
      loadHistory(historyPagination.page);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, 'History item could not be deleted.'));
    }
  };

  // ============================================================
  // RENDER: USER INTERFACE
  // ============================================================

  return (
    <section className="language-helper-page" aria-labelledby="language-helper-title">
      {/* ===== HERO SECTION ===== */}
      {/* Header area with title, description, and current language pair display */}
      <div className="language-helper-hero">
        <div>
          <p className="eyebrow">Travel translator</p>
          <h2 id="language-helper-title">Language Helper</h2>
          <p>
            Choose the spoken language and target language, translate trip phrases,
            play them aloud, and return to previous translations from history.
          </p>
          <div className="language-helper-meta" aria-label="Language helper capabilities">
            <span>
              <Mic size={15} aria-hidden="true" />
              Manual speech language
            </span>
            <span>
              <Languages size={15} aria-hidden="true" />
              Provider language list
            </span>
            <span>
              <History size={15} aria-hidden="true" />
              Saved history
            </span>
          </div>
        </div>
        <div className="language-helper-live-card">
          <span>Current pair</span>
          <strong>{selectedSourceLanguage?.name || 'Loading'}</strong>
          <small>to {selectedTargetLanguage?.name || 'language options'}</small>
        </div>
      </div>

      {/* ===== MAIN GRID: TRANSLATION PANEL + HISTORY ===== */}
      <div className="language-helper-grid">
        {/* ===== TRANSLATION PANEL ===== */}
        <form className="language-helper-panel" onSubmit={handleTranslate}>
          
          {/* Language selection toolbar */}
          <div className="language-helper-toolbar">
            {/* Source language dropdown */}
            <label>
              <span>Speak in</span>
              <select
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
                disabled={isLoadingLanguages || !hasLanguages}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Swap languages button */}
            <button
              className="language-helper-swap"
              type="button"
              onClick={handleSwapLanguages}
              aria-label="Swap languages"
              disabled={!hasLanguages}
            >
              <ArrowRightLeft size={18} aria-hidden="true" />
            </button>

            {/* Target language dropdown */}
            <label>
              <span>Translate to</span>
              <select
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                disabled={isLoadingLanguages || !hasLanguages}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Empty state when languages fail to load */}
          {!hasLanguages && !isLoadingLanguages && (
            <p className="settings-empty">No language options are available from the translation provider yet.</p>
          )}

          {/* Translation workspace: Source and target text areas */}
          <div className="language-helper-workspace">
            
            {/* Source text card with speech recognition status */}
            <label className="language-helper-text-card">
              <span>{selectedSourceLanguage?.name || 'Source'} phrase</span>
              <textarea
                value={sourceText}
                onChange={(event) => {
                  setSourceText(event.target.value);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                maxLength={1000}
                placeholder="Type or record a phrase for the trip..."
              />
              <small>{sourceText.length}/1000 characters</small>
              
              {/* Listening status indicator */}
              {isListening ? (
                <div className="language-helper-listening-status" role="status" aria-live="polite">
                  <i aria-hidden="true" />
                  <span>
                    <strong>Listening now</strong>
                    Speak clearly in {selectedSourceLanguage?.name || 'the selected language'}. Click Stop recording when finished.
                  </span>
                </div>
              ) : null}
            </label>

            {/* Target translation output card */}
            <div className="language-helper-text-card language-helper-output">
              <span>{selectedTargetLanguage?.name || 'Target'} translation</span>
              {translatedText ? (
                <p>{translatedText}</p>
              ) : (
                <p className="language-helper-empty">Translation will appear here after submitting a phrase.</p>
              )}
            </div>
          </div>

          {/* Action buttons toolbar */}
          <div className="language-helper-actions">
            {/* Record button with listening state */}
            <button
              className={isListening ? 'secondary-action language-helper-record is-listening' : 'secondary-action language-helper-record'}
              type="button"
              aria-pressed={isListening}
              onClick={handleListen}
            >
              {isListening ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
              {isListening ? 'Stop recording' : 'Start recording'}
            </button>
            
            {/* Translate button */}
            <button className="primary-action" type="submit" disabled={isTranslating || !hasLanguages}>
              <Send size={17} aria-hidden="true" />
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            
            {/* Text-to-speech play button */}
            <button className="secondary-action" type="button" onClick={handleSpeak}>
              <Play size={17} aria-hidden="true" />
              Play
            </button>
            
            {/* Copy to clipboard button */}
            <button className="secondary-action" type="button" onClick={handleCopyTranslation}>
              <Clipboard size={17} aria-hidden="true" />
              Copy
            </button>
            
            {/* Clear all button */}
            <button className="secondary-action" type="button" onClick={handleClear}>
              <RotateCcw size={17} aria-hidden="true" />
              Clear
            </button>
          </div>

          {/* Feedback messages */}
          {errorMessage && <p className="form-error language-helper-status">{errorMessage}</p>}
          {successMessage && <p className="form-success language-helper-status">{successMessage}</p>}
        </form>

        {/* ===== HISTORY SIDEBAR ===== */}
        <aside className="language-helper-history" aria-labelledby="language-helper-history-title">
          
          {/* History header */}
          <div className="language-helper-section-heading">
            <span>History</span>
            <h3 id="language-helper-history-title">Previous translations</h3>
          </div>

          {/* History search bar */}
          <form className="language-helper-history-search" onSubmit={handleHistorySearch}>
            <Search size={16} aria-hidden="true" />
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search history"
            />
            <button type="submit">Search</button>
          </form>

          {/* History list or empty states */}
          {isLoadingHistory ? (
            <p className="settings-empty">Loading translation history...</p>
          ) : historyItems.length === 0 ? (
            <p className="settings-empty">No translation history yet. Translate a phrase to save it here.</p>
          ) : (
            <div className="language-helper-history-list">
              {historyItems.map((item) => (
                <article key={item.id}>
                  {/* Clickable history item to load translation */}
                  <button type="button" onClick={() => handleUseHistory(item)}>
                    <span>
                      {item.sourceLanguage?.name || item.sourceLanguage?.code} to{' '}
                      {item.targetLanguage?.name || item.targetLanguage?.code}
                    </span>
                    <strong>{item.sourceText}</strong>
                    <small>{item.translatedText}</small>
                    <em>{formatHistoryDate(item.createdAt)}</em>
                  </button>
                  
                  {/* Delete history item button */}
                  <button
                    className="language-helper-history-delete"
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    aria-label="Delete history item"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          )}

          {/* Pagination controls */}
          {historyPagination.totalPages > 1 && (
            <div className="language-helper-history-pages">
              <button
                type="button"
                disabled={historyPagination.page <= 1}
                onClick={() => loadHistory(historyPagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {historyPagination.page} of {historyPagination.totalPages}
              </span>
              <button
                type="button"
                disabled={historyPagination.page >= historyPagination.totalPages}
                onClick={() => loadHistory(historyPagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ===== SUGGESTIONS SECTION ===== */}
      {/* Quick phrase suggestions for common travel scenarios */}
      <section className="language-helper-suggestions" aria-labelledby="language-helper-suggestions-title">
        <div className="language-helper-section-heading">
          <span>Quick phrases</span>
          <h3 id="language-helper-suggestions-title">Useful travel prompts</h3>
        </div>
        <div className="language-helper-chip-grid">
          {phraseSuggestions.map((phrase) => (
            <button
              type="button"
              key={phrase}
              onClick={() => {
                setSourceText(phrase);
                setTranslatedText('');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              {phrase}
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default LanguageHelperPage;

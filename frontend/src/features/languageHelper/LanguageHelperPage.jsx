/**
 * Language Helper module.
 * Page state, event handlers, and render sections define the screen experience.
 */
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
// LanguageHelperPage renders the main screen and handles nearby interactions.
function LanguageHelperPage() {
  const [languages, setLanguages] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 0 });
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const recognitionRef = useRef(null);
  const selectedSourceLanguage = useMemo(
    () => getLanguageByCode(languages, sourceLanguage),
    [languages, sourceLanguage]
  );
  const selectedTargetLanguage = useMemo(
    () => getLanguageByCode(languages, targetLanguage),
    [languages, targetLanguage]
  );
  const recognitionSupported = typeof window !== 'undefined' && Boolean(getSpeechRecognition());
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasLanguages = languages.length > 0;

  const loadHistory = useCallback((nextPage = 1, search = historySearch) => {
    setIsLoadingHistory(true);

    return getLanguageHelperHistory({ page: nextPage, limit: historyPagination.limit, search })
      .then((response) => {
        const history = response.data?.data?.history;
        setHistoryItems(history?.items || []);
        setHistoryPagination(history?.pagination || { page: nextPage, limit: 8, total: 0, totalPages: 0 });
      })
      .catch(() => {
        setHistoryItems([]);
      })
      .finally(() => setIsLoadingHistory(false));
  }, [historyPagination.limit, historySearch]);
  useEffect(() => {
    let isMounted = true;

    getLanguageHelperLanguages()
      .then((response) => {
        const nextLanguages = response.data?.data?.languages || [];
        const message = response.data?.data?.message;

        if (!isMounted) return;

        setLanguages(nextLanguages);
        setSourceLanguage(nextLanguages.find((language) => language.code === 'en')?.code || nextLanguages[0]?.code || '');
        setTargetLanguage(nextLanguages.find((language) => language.code !== 'en')?.code || nextLanguages[1]?.code || nextLanguages[0]?.code || '');

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

    // Cleanup prevents state updates after component unmount.
    return () => {
      isMounted = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    let isMounted = true;

    getLanguageHelperHistory({ page: 1, limit: 8 })
      .then((response) => {
        if (!isMounted) return;

        const history = response.data?.data?.history;
        setHistoryItems(history?.items || []);
        setHistoryPagination(history?.pagination || { page: 1, limit: 8, total: 0, totalPages: 0 });
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

    // Cleanup prevents state updates after component unmount.
    return () => {
      isMounted = false;
    };
  }, []);
  const handleTranslate = async (event) => {
    event?.preventDefault();
    const trimmedText = sourceText.trim();
    if (!hasLanguages) {
      setErrorMessage('Language options are not available yet.');
      setSuccessMessage('');
      return;
    }
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

      if (!translation?.available) {
        setTranslatedText('');
        setErrorMessage(translation?.message || 'Translation temporarily unavailable.');
        return;
      }

      setTranslatedText(translation.translatedText);
      setSuccessMessage(translation.cached ? 'Translated from recent cache and saved to history.' : 'Translation saved to history.');
      loadHistory(1);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, 'Translation failed. Please try again.'));
      setTranslatedText('');
    } finally {
      setIsTranslating(false);
    }
  };
  const handleListen = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!recognitionSupported) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    if (!selectedSourceLanguage) {
      setErrorMessage('Select a speaking language before recording.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    const recognition = new SpeechRecognition();
    recognition.lang = getBrowserSpeechCode(selectedSourceLanguage.code);
    recognition.continuous = false;
    recognition.interimResults = true;

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

    recognitionRef.current = recognition;
    recognition.start();
  };
  const handleSpeak = () => {
    if (!speechSupported) {
      setErrorMessage('Text to speech is not supported in this browser.');
      return;
    }

    const textToRead = translatedText.trim();

    if (!textToRead || !selectedTargetLanguage) {
      setErrorMessage('Translate a phrase before playing audio.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = getBrowserSpeechCode(selectedTargetLanguage.code);
    window.speechSynthesis.speak(utterance);
  };
  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setErrorMessage('');
    setSuccessMessage('');
  };
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
  const handleClear = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setSourceText('');
    setTranslatedText('');
    setErrorMessage('');
    setSuccessMessage('');
  };
  const handleHistorySearch = (event) => {
    event.preventDefault();
    loadHistory(1, historySearch);
  };
  const handleUseHistory = (item) => {
    setSourceLanguage(item.sourceLanguage?.code || sourceLanguage);
    setTargetLanguage(item.targetLanguage?.code || targetLanguage);
    setSourceText(item.sourceText);
    setTranslatedText(item.translatedText);
    setErrorMessage('');
    setSuccessMessage('History item loaded.');
  };
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
  return (
    <section className="language-helper-page" aria-labelledby="language-helper-title">
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

      <div className="language-helper-grid">
        <form className="language-helper-panel" onSubmit={handleTranslate}>
          <div className="language-helper-toolbar">
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

            <button
              className="language-helper-swap"
              type="button"
              onClick={handleSwapLanguages}
              aria-label="Swap languages"
              disabled={!hasLanguages}
            >
              <ArrowRightLeft size={18} aria-hidden="true" />
            </button>

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

          {!hasLanguages && !isLoadingLanguages && (
            <p className="settings-empty">No language options are available from the translation provider yet.</p>
          )}

          <div className="language-helper-workspace">
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
            </label>

            <div className="language-helper-text-card language-helper-output">
              <span>{selectedTargetLanguage?.name || 'Target'} translation</span>
              {translatedText ? (
                <p>{translatedText}</p>
              ) : (
                <p className="language-helper-empty">Translation will appear here after submitting a phrase.</p>
              )}
            </div>
          </div>

          <div className="language-helper-actions">
            <button className="secondary-action" type="button" onClick={handleListen}>
              {isListening ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
              {isListening ? 'Stop' : 'Record'}
            </button>
            <button className="primary-action" type="submit" disabled={isTranslating || !hasLanguages}>
              <Send size={17} aria-hidden="true" />
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            <button className="secondary-action" type="button" onClick={handleSpeak}>
              <Play size={17} aria-hidden="true" />
              Play
            </button>
            <button className="secondary-action" type="button" onClick={handleCopyTranslation}>
              <Clipboard size={17} aria-hidden="true" />
              Copy
            </button>
            <button className="secondary-action" type="button" onClick={handleClear}>
              <RotateCcw size={17} aria-hidden="true" />
              Clear
            </button>
          </div>

          {errorMessage && <p className="form-error language-helper-status">{errorMessage}</p>}
          {successMessage && <p className="form-success language-helper-status">{successMessage}</p>}
        </form>

        <aside className="language-helper-history" aria-labelledby="language-helper-history-title">
          <div className="language-helper-section-heading">
            <span>History</span>
            <h3 id="language-helper-history-title">Previous translations</h3>
          </div>

          <form className="language-helper-history-search" onSubmit={handleHistorySearch}>
            <Search size={16} aria-hidden="true" />
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search history"
            />
            <button type="submit">Search</button>
          </form>

          {isLoadingHistory ? (
            <p className="settings-empty">Loading translation history...</p>
          ) : historyItems.length === 0 ? (
            <p className="settings-empty">No translation history yet. Translate a phrase to save it here.</p>
          ) : (
            <div className="language-helper-history-list">
              {historyItems.map((item) => (
                <article key={item.id}>
                  <button type="button" onClick={() => handleUseHistory(item)}>
                    <span>
                      {item.sourceLanguage?.name || item.sourceLanguage?.code} to{' '}
                      {item.targetLanguage?.name || item.targetLanguage?.code}
                    </span>
                    <strong>{item.sourceText}</strong>
                    <small>{item.translatedText}</small>
                    <em>{formatHistoryDate(item.createdAt)}</em>
                  </button>
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

export default LanguageHelperPage;

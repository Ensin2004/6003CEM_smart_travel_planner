/**
 * Explore AI panel module.
 * Shared presentation keeps AI summaries consistent across every Explore menu.
 */
import { ArrowLeft, Bot, ExternalLink, LoaderCircle, MessageSquare, RefreshCw, Send, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sendAiChatPrompt } from '../../../api/aiAssistantApi';
import './ExploreAiPanel.css';

const getRatingText = (item = {}) => {
  const rating = Number(item.rating || 0);
  const reviewCount = Number(item.reviewCount || item.reviews || 0);

  if (!rating) {
    return 'Rating unavailable';
  }

  return `${rating.toFixed(1)} stars${reviewCount ? ` (${reviewCount.toLocaleString()} reviews)` : ''}`;
};

const getRecommendationDescription = (item = {}, viewLabel = 'Explore') =>
  item.reason ||
  item.bestFor ||
  item.description ||
  item.address ||
  item.destinationName ||
  item.arrival?.airport?.city ||
  `${viewLabel} option with useful details for this search.`;

function ExploreAiPanel({
  activeAi,
  activeOption,
  canRefresh = false,
  destinationLabel,
  isLoading = false,
  items = [],
  currentLocationName = '',
  onRefresh,
  resultCount = 0,
  summary,
}) {
  const [panelMode, setPanelMode] = useState('main');
  const [questionDraft, setQuestionDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [questionError, setQuestionError] = useState('');
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const panelSummary =
    summary ||
    activeAi?.summary ||
    activeAi?.message ||
    (resultCount
      ? `${activeOption.label} has ${resultCount} result${resultCount === 1 ? '' : 's'} ready for ${destinationLabel}.`
      : `Search results will unlock AI insights for ${activeOption.label.toLowerCase()}.`);
  const aiPicks = activeAi?.picks?.length
    ? activeAi.picks.map((pick) => ({
        id: pick.itemName,
        name: pick.itemName,
        meta: `${pick.score}/100`,
        description: pick.reason,
      }))
    : items.slice(0, 3).map((item, index) => ({
        id: item.id || item.name || `${activeOption.id}-${index}`,
        name: item.name || item.airline?.name || item.operatorName || item.destinationName || `Recommendation ${index + 1}`,
        meta: getRatingText(item),
        description: getRecommendationDescription(item, activeOption.label),
        imageUrl: item.imageUrl || item.imageUrls?.[0] || item.thumbnail || '',
      }));
  const hasResults = resultCount > 0;
  const locationLabel = currentLocationName || 'your area';
  const visiblePicks = aiPicks.slice(0, 3);
  const fullRecommendationItems = (aiPicks.length ? aiPicks : items.map((item, index) => ({
    id: item.id || item.name || `${activeOption.id}-full-${index}`,
    name: item.name || item.airline?.name || item.operatorName || item.destinationName || `Recommendation ${index + 1}`,
    meta: getRatingText(item),
    description: getRecommendationDescription(item, activeOption.label),
    imageUrl: item.imageUrl || item.imageUrls?.[0] || item.thumbnail || '',
  }))).slice(0, 10);
  const suggestedQuestions = [
    `What is ${locationLabel} known for?`,
    `Best places near ${locationLabel}`,
    'Budget-friendly travel ideas',
    'Places open now',
  ];
  const questionContext = useMemo(() => {
    const itemLines = items.slice(0, 5).map((item, index) => {
      const name = item.name || item.airline?.name || item.operatorName || item.destinationName || `Option ${index + 1}`;
      const rating = item.rating ? `${item.rating} stars` : 'rating unavailable';
      const price = item.priceDetail?.display || item.price || '';

      return `${index + 1}. ${name} - ${[rating, price, item.address || item.destinationName].filter(Boolean).join(', ')}`;
    });

    return [
      `Explore menu: ${activeOption.label}`,
      `Destination or context: ${destinationLabel || locationLabel}`,
      resultCount ? `Loaded results: ${resultCount}` : 'Loaded results: none',
      activeAi?.summary ? `Current AI summary: ${activeAi.summary}` : '',
      itemLines.length ? `Top loaded items:\n${itemLines.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [activeAi?.summary, activeOption.label, destinationLabel, items, locationLabel, resultCount]);

  const openQuestionMode = (question = '') => {
    setPanelMode('question');
    setQuestionDraft(question);
    setQuestionError('');
  };

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();
    const trimmedQuestion = questionDraft.trim();

    if (!trimmedQuestion || isQuestionLoading) {
      return;
    }

    setQuestionError('');
    setIsQuestionLoading(true);
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedQuestion,
    };
    const recentHistory = [...chatMessages, userMessage]
      .slice(-8)
      .map((message) => `${message.role === 'user' ? 'Traveler' : 'AI'}: ${message.text}`)
      .join('\n');
    setChatMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuestionDraft('');
    try {
      const prompt = [
        trimmedQuestion,
        '',
        'Continue the chat using this recent conversation:',
        recentHistory,
        '',
        'Use this Explore context:',
        questionContext,
      ]
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000);
      const response = await sendAiChatPrompt({
        prompt,
        page: `Explore ${activeOption.label}`.slice(0, 160),
      });
      const reply = response.data.data.reply;
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: reply.answer,
          available: reply.available,
        },
      ]);
    } catch (error) {
      setQuestionError(error.response?.data?.message || 'Unable to reach AI right now.');
    } finally {
      setIsQuestionLoading(false);
    }
  };

  if (panelMode === 'question') {
    return (
      <aside className="explore-ai-panel" aria-label={`${activeOption.label} AI question`}>
        <div className="explore-ai-panel-heading">
          <div>
            <span>
              <MessageSquare size={17} aria-hidden="true" />
              AI chat
            </span>
            <p>Type follow-up questions about this search.</p>
          </div>
          <button type="button" onClick={() => setPanelMode('main')}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </button>
        </div>

        <div className="explore-ai-chat-thread" aria-live="polite">
          {chatMessages.length ? (
            chatMessages.map((message) => (
              <article key={message.id} className={`explore-ai-chat-message explore-ai-chat-message-${message.role}`}>
                <span>
                  {message.role === 'user' ? <MessageSquare size={14} aria-hidden="true" /> : <Bot size={14} aria-hidden="true" />}
                  {message.role === 'user' ? 'You' : message.available === false ? 'AI unavailable' : 'AI'}
                </span>
                <p>{message.text}</p>
              </article>
            ))
          ) : (
            <section className="explore-ai-chat-empty">
              <Bot size={28} aria-hidden="true" />
              <strong>Ask anything about this search</strong>
              <p>Questions stay in this panel so follow-ups can use the recent chat context.</p>
            </section>
          )}
          {isQuestionLoading && (
            <article className="explore-ai-chat-message explore-ai-chat-message-assistant">
              <span>
                <LoaderCircle className="explore-spin" size={14} aria-hidden="true" />
                AI
              </span>
              <p>Thinking about the current results...</p>
            </article>
          )}
        </div>

        <form className="explore-ai-question-form" onSubmit={handleQuestionSubmit}>
          <label>
            <span className="sr-only">AI question</span>
            <textarea
              value={questionDraft}
              onChange={(event) => setQuestionDraft(event.target.value)}
              placeholder={`Ask about ${destinationLabel || locationLabel}`}
              rows={5}
            />
          </label>
          <button type="submit" disabled={!questionDraft.trim() || isQuestionLoading}>
            {isQuestionLoading ? <LoaderCircle className="explore-spin" size={15} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
            {isQuestionLoading ? 'Sending...' : 'Send'}
          </button>
        </form>

        {questionError && <p className="explore-ai-error">{questionError}</p>}
      </aside>
    );
  }

  if (panelMode === 'full') {
    return (
      <aside className="explore-ai-panel" aria-label={`${activeOption.label} full AI recommendations`}>
        <div className="explore-ai-panel-heading">
          <div>
            <span>
              <Sparkles size={17} aria-hidden="true" />
              Full recommendations
            </span>
            <p>{fullRecommendationItems.length} AI-ranked option{fullRecommendationItems.length === 1 ? '' : 's'} for this search.</p>
          </div>
          <button type="button" onClick={() => setPanelMode('main')}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </button>
        </div>

        <section className="explore-ai-recommendations explore-ai-recommendations-full">
          <div className="explore-ai-recommendation-list">
            {fullRecommendationItems.length ? (
              fullRecommendationItems.map((pick, index) => (
                <article key={`${pick.id}-${index}`} className="explore-ai-recommendation">
                  <span className="explore-ai-rank">{index + 1}</span>
                  <div>
                    <strong>{pick.name}</strong>
                    <small>
                      <Star size={13} fill="currentColor" aria-hidden="true" />
                      {pick.meta}
                    </small>
                    <p>{pick.description}</p>
                  </div>
                  {pick.imageUrl ? <img src={pick.imageUrl} alt="" loading="lazy" /> : null}
                </article>
              ))
            ) : (
              <p className="explore-ai-empty">Search results are needed before full recommendations can appear.</p>
            )}
          </div>
        </section>

        <section className="explore-ai-chat-preview">
          <strong>Need a different angle?</strong>
          <p>Ask AI to compare, filter by budget, or suggest the best timing.</p>
          <button type="button" onClick={() => openQuestionMode('Which option should I choose and why?')}>
            <MessageSquare size={15} aria-hidden="true" />
            Open chat
          </button>
        </section>
      </aside>
    );
  }

  return (
    <aside className="explore-ai-panel" aria-label={`${activeOption.label} AI insights`}>
      <div className="explore-ai-panel-heading">
        <div>
          <span>
            <Sparkles size={17} aria-hidden="true" />
            Ask AI
          </span>
          <p>AI insights for your search</p>
        </div>
        <div className="explore-ai-heading-actions">
          <button type="button" onClick={() => openQuestionMode('')}>
            <MessageSquare size={15} aria-hidden="true" />
            Ask
          </button>
          <button type="button" onClick={onRefresh} disabled={!canRefresh || isLoading}>
            {isLoading ? <LoaderCircle className="explore-spin" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
            Refresh
          </button>
        </div>
      </div>

      {hasResults ? (
        <>
          <section className="explore-ai-summary-card">
            <strong>
              <Sparkles size={15} aria-hidden="true" />
              AI summary
            </strong>
            <p>{panelSummary}</p>
          </section>

          <section className="explore-ai-recommendations">
            <h3>Top recommendations</h3>
            <div className="explore-ai-recommendation-list">
              {visiblePicks.length ? (
                visiblePicks.map((pick, index) => (
                  <article key={`${pick.id}-${index}`} className="explore-ai-recommendation">
                    <span className="explore-ai-rank">{index + 1}</span>
                    <div>
                      <strong>{pick.name}</strong>
                      <small>
                        <Star size={13} fill="currentColor" aria-hidden="true" />
                        {pick.meta}
                      </small>
                      <p>{pick.description}</p>
                    </div>
                    {pick.imageUrl ? <img src={pick.imageUrl} alt="" loading="lazy" /> : null}
                  </article>
                ))
              ) : (
                <p className="explore-ai-empty">Recommendations appear after a search has results.</p>
              )}
            </div>
            <button className="explore-ai-full-button" type="button" disabled={!fullRecommendationItems.length} onClick={() => setPanelMode('full')}>
              View full recommendations
              <ExternalLink size={14} aria-hidden="true" />
            </button>
          </section>
        </>
      ) : (
        <section className="explore-ai-ready-card">
          <div className="explore-ai-ready-icon">
            <MessageSquare size={34} aria-hidden="true" />
          </div>
          <h3>Ready to assist near {locationLabel}</h3>
          <p>Search for a place, cuisine, stay, or route and AI can provide local insights, recommendations, and travel tips.</p>
          <div className="explore-ai-question-list" aria-label="Suggested AI questions">
            <strong>Try asking about:</strong>
            {suggestedQuestions.map((question) => (
              <button type="button" key={question} onClick={() => openQuestionMode(question)}>
                <MessageSquare size={14} aria-hidden="true" />
                {question}
              </button>
            ))}
          </div>
          <small>AI responses may not always be accurate.</small>
        </section>
      )}

      <section className="explore-ai-chat-preview" aria-label="Ask AI chat entry">
        <strong>
          <MessageSquare size={15} aria-hidden="true" />
          Ask a follow-up
        </strong>
        <button type="button" onClick={() => openQuestionMode('')}>
          <span>Type a question about this search...</span>
          <Send size={14} aria-hidden="true" />
        </button>
      </section>
    </aside>
  );
}

export default ExploreAiPanel;

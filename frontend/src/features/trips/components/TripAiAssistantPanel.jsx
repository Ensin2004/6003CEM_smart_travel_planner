/**
 * Trip AI Assistant panel displays a contextual Gemini conversation and map-ready place cards.
 */
import { MapPin, Send, Sparkles, Star, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

function TripAiAssistantPanel({
  error,
  input,
  isLoading,
  messages,
  onClose,
  onSelectPlace,
  onSend,
  selectedPlaceId,
  setInput,
}) {
  const conversationRef = useRef(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [isLoading, messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <section className="trip-ai-assistant" aria-label="Trip AI Assistant">
      <header className="trip-ai-assistant-header">
        <div>
          <span><Sparkles size={15} aria-hidden="true" /> Gemini</span>
          <strong>AI Assistance</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close AI Assistance">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <div className="trip-ai-conversation" ref={conversationRef}>
        {!messages.length ? (
          <div className="trip-ai-welcome">
            <Sparkles size={22} aria-hidden="true" />
            <strong>Plan this trip with AI</strong>
            <p>Ask for places, budget-friendly ideas, food, hotels, or help improving the itinerary.</p>
          </div>
        ) : null}

        {messages.map((message) => (
          <article className={`trip-ai-message is-${message.role}`} key={message.id}>
            <small>{message.role === 'user' ? 'You' : 'Gemini'}</small>
            <p>{message.text}</p>
            {message.places?.length ? (
              <div className="trip-ai-place-list">
                {message.places.map((place) => (
                  <button
                    className={selectedPlaceId === place.id ? 'trip-ai-place-card is-active' : 'trip-ai-place-card'}
                    key={place.id}
                    type="button"
                    onClick={() => onSelectPlace(place)}
                  >
                    <span className="trip-ai-place-image">
                      {place.imageUrl ? <img src={place.imageUrl} alt="" loading="lazy" /> : <MapPin size={22} aria-hidden="true" />}
                    </span>
                    <span className="trip-ai-place-copy">
                      <small>{place.categoryId}</small>
                      <strong>{place.name}</strong>
                      <span>{place.aiReason || place.address}</span>
                      <em>
                        <Star size={12} fill={place.rating && place.rating !== 'N/A' ? 'currentColor' : 'none'} aria-hidden="true" />
                        {place.rating && place.rating !== 'N/A' ? Number(place.rating).toFixed(1) : 'Map result'}
                      </em>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}

        {isLoading ? (
          <div className="trip-ai-typing" aria-label="Gemini is responding">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {error ? <p className="trip-ai-error" role="alert">{error}</p> : null}
      </div>

      <form className="trip-ai-prompt-form" onSubmit={handleSubmit}>
        <label htmlFor="trip-ai-prompt" className="sr-only">Ask AI about this trip</label>
        <input
          id="trip-ai-prompt"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything about this trip..."
          autoComplete="off"
        />
        <button type="submit" aria-label="Send message" disabled={isLoading || input.trim().length < 2}>
          <Send size={17} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

export default TripAiAssistantPanel;

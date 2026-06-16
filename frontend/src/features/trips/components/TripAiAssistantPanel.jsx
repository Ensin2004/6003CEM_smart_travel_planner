/**
 * Trip AI Assistant panel displays a contextual Groq Llama conversation and map-ready place cards.
 * 
 * This component renders a chat interface that enables interactions with the Llama AI model
 * for trip planning assistance, including place recommendations and itinerary suggestions.
 * The panel includes a message history, input form, and place card display for recommended locations.
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
  // Reference to the conversation container DOM element for scroll management
  const conversationRef = useRef(null);

  /**
   * Effect hook that automatically scrolls the conversation container to the bottom
   * when new messages are added or loading state changes.
   * This ensures the most recent content remains visible to the user.
   */
  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [isLoading, messages]);

  /**
   * Handles form submission events from the input prompt.
   * Prevents default browser form behavior and triggers the send callback
   * to process the user's message through the AI system.
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <section className="trip-ai-assistant" aria-label="Trip AI Assistant">
      {/* Panel header displaying the AI model name and close control */}
      <header className="trip-ai-assistant-header">
        <div>
          <span><Sparkles size={15} aria-hidden="true" /> Llama 3.1</span>
          <strong>AI Assistance</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close AI Assistance">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      {/* Main conversation area that displays all messages, welcome state, loading indicator, and errors */}
      <div className="trip-ai-conversation" ref={conversationRef}>
        {/* Welcome message shown when no conversation history exists */}
        {!messages.length ? (
          <div className="trip-ai-welcome">
            <Sparkles size={22} aria-hidden="true" />
            <strong>Plan this trip with AI</strong>
            <p>Ask for places, budget-friendly ideas, food, hotels, or help improving the itinerary.</p>
          </div>
        ) : null}

        {/* Message list rendering each conversation entry with role-based styling */}
        {messages.map((message) => (
          <article className={`trip-ai-message is-${message.role}`} key={message.id}>
            <small>{message.role === 'user' ? 'You' : 'Llama 3.1'}</small>
            <p>{message.text}</p>
            {/* Place recommendation cards displayed when the AI response includes location data */}
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

        {/* Animated typing indicator displayed while the AI processes a response */}
        {isLoading ? (
          <div className="trip-ai-typing" aria-label="Llama 3.1 is responding">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {/* Error message display for API or processing failures */}
        {error ? <p className="trip-ai-error" role="alert">{error}</p> : null}
      </div>

      {/* Input form for sending new messages to the AI assistant */}
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

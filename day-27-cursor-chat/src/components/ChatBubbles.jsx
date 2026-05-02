export function ChatBubbles({ messages }) {
  if (!messages.length) {
    return null
  }

  return (
    <div className="chat-bubble-layer" aria-live="polite" aria-atomic="false">
      {messages.map((message) => (
        <article
          className="floating-message"
          key={message.id}
          style={{
            '--bubble-color': message.color,
            left: `${message.x * 100}%`,
            top: `${message.y * 100}%`,
          }}
        >
          <strong>{message.name}</strong>
          <span>{message.text}</span>
        </article>
      ))}
    </div>
  )
}

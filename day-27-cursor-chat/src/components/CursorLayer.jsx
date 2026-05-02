function TypingDots() {
  return (
    <span className="typing-dots" aria-label="Typing">
      <span />
      <span />
      <span />
    </span>
  )
}

function RemoteCursor({ user }) {
  return (
    <div
      className={`remote-cursor is-${user.presence ?? 'active'} ${user.idle ? 'is-idle' : ''}`}
      style={{
        '--cursor-color': user.color,
        left: `${user.x * 100}%`,
        top: `${user.y * 100}%`,
      }}
      aria-hidden="true"
    >
      <svg className="remote-cursor-arrow" viewBox="0 0 28 32" focusable="false">
        <path
          d="M3.3 2.2 24.6 17c1.5 1 .9 3.4-.9 3.6l-8.2 1-4.4 7.1c-1 1.6-3.5 1.1-3.8-.8L2.1 4.2c-.3-1.7 1.7-2.9 3.2-2Z"
          fill="var(--cursor-color)"
        />
        <path
          d="m11.5 20.4-4.1-15 13.4 9.3-7.2.9-2.1 4.8Z"
          fill="rgba(255,255,255,0.32)"
        />
      </svg>
      <span className="cursor-name">{user.name}</span>
      {user.isTyping ? <TypingDots /> : null}
      {user.idle ? <span className="idle-badge">Zzz</span> : null}
    </div>
  )
}

export function CursorLayer({ users }) {
  if (!users.length) {
    return null
  }

  return (
    <div className="cursor-layer" aria-hidden="true">
      {users.map((user) => (
        <RemoteCursor key={user.id} user={user} />
      ))}
    </div>
  )
}

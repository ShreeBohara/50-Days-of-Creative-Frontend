const emojiOptions = ['✨', '🔥', '🎉', '👏', '💡', '❤️']

export function ReactionLayer({ reactions }) {
  if (!reactions.length) {
    return null
  }

  return (
    <div className="reaction-layer" aria-hidden="true">
      {reactions.map((reaction) => (
        <span
          className="reaction-burst"
          key={reaction.id}
          style={{
            '--reaction-color': reaction.color,
            left: `${reaction.x * 100}%`,
            top: `${reaction.y * 100}%`,
          }}
        >
          {reaction.emoji}
        </span>
      ))}
    </div>
  )
}

export function EmojiPicker({ picker, onPick, onDismiss }) {
  if (!picker) {
    return null
  }

  return (
    <div className="emoji-picker-wrap" data-control>
      <button className="picker-scrim" type="button" aria-label="Close emoji picker" onClick={onDismiss} />
      <div
        className="emoji-picker"
        role="menu"
        aria-label="Emoji reactions"
        style={{
          left: picker.clientX,
          top: picker.clientY,
        }}
      >
        {emojiOptions.map((emoji, index) => (
          <button
            className="emoji-option"
            type="button"
            role="menuitem"
            aria-label={`Send ${emoji} reaction`}
            key={emoji}
            style={{ '--emoji-index': index }}
            onClick={() => onPick(emoji, picker.point)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

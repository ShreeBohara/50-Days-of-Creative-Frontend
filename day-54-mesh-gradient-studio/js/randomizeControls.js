function actionIcon(type) {
  if (type === "shuffle") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3c4.5 0 5.5 10 10 10h3m-3-3 3 3-3 3M4 17h3c1.8 0 3-1.6 4.1-3.5M17 4l3 3-3 3M20 7h-3c-1.8 0-3 1.6-4.1 3.5"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"/><circle cx="12" cy="12" r="3.5"/></svg>';
}

function actionButton(label, type, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.innerHTML = `${actionIcon(type)}<span>${label}</span>`;
  button.addEventListener("click", handler);
  return button;
}

export function mountRandomizeControls({ container, onRandomize, onShuffle }) {
  container.replaceChildren(
    actionButton("Randomize field", "randomize", "action-button action-button--primary", onRandomize),
    actionButton("Shuffle motion", "shuffle", "action-button", onShuffle),
  );
}

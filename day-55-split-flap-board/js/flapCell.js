function createHalf(className) {
  const half = document.createElement("span");
  half.className = `flap-half ${className}`;

  const glyph = document.createElement("span");
  glyph.className = "flap-glyph";
  glyph.textContent = " ";
  half.append(glyph);

  return { half, glyph };
}

export function createFlapCell(initialCharacter = " ") {
  const element = document.createElement("span");
  element.className = "flap-cell";
  element.setAttribute("aria-hidden", "true");

  const staticTop = createHalf("flap-top flap-static-top");
  const staticBottom = createHalf("flap-bottom flap-static-bottom");
  const foldingFront = createHalf("flap-top flap-fold-front");
  const foldingBack = createHalf("flap-bottom flap-fold-back");
  element.append(staticTop.half, staticBottom.half, foldingFront.half, foldingBack.half);

  let currentCharacter = initialCharacter;
  let flipping = false;
  let destroyed = false;
  let midpointTimer = 0;
  let completionTimer = 0;
  let cancelActiveFlip = null;
  let animationCycle = 0;

  function writeStatic(character) {
    staticTop.glyph.textContent = character;
    staticBottom.glyph.textContent = character;
  }

  function setCharacter(character) {
    currentCharacter = character;
    writeStatic(character);
    foldingFront.glyph.textContent = character;
    foldingBack.glyph.textContent = character;
  }

  function clearActiveTimers() {
    window.clearTimeout(midpointTimer);
    window.clearTimeout(completionTimer);
    midpointTimer = 0;
    completionTimer = 0;
  }

  function flipOnce(nextCharacter, { duration = 100, instant = false, onMidpoint } = {}) {
    if (destroyed || nextCharacter === currentCharacter) {
      return Promise.resolve(currentCharacter);
    }

    if (instant) {
      setCharacter(nextCharacter);
      onMidpoint?.(nextCharacter);
      return Promise.resolve(currentCharacter);
    }

    if (flipping) {
      return Promise.reject(new Error("A flap cell cannot start a second flip while one is active"));
    }

    flipping = true;
    const previousCharacter = currentCharacter;
    const safeDuration = Math.max(16, Number(duration) || 100);
    element.style.setProperty("--flip-duration", `${safeDuration}ms`);
    staticTop.glyph.textContent = nextCharacter;
    staticBottom.glyph.textContent = previousCharacter;
    foldingFront.glyph.textContent = previousCharacter;
    foldingBack.glyph.textContent = nextCharacter;
    animationCycle = animationCycle ? 0 : 1;
    const animationClass = animationCycle ? "is-flipping-a" : "is-flipping-b";
    element.classList.remove("is-flipping-a", "is-flipping-b");
    element.classList.add(animationClass);

    return new Promise((resolve) => {
      let midpointReached = false;

      function reachMidpoint() {
        if (midpointReached || destroyed) return;
        midpointReached = true;
        currentCharacter = nextCharacter;
        staticBottom.glyph.textContent = nextCharacter;
        onMidpoint?.(nextCharacter);
      }

      function finish() {
        if (!flipping) return;
        clearActiveTimers();
        reachMidpoint();
        flipping = false;
        element.classList.remove("is-flipping-a", "is-flipping-b");
        setCharacter(nextCharacter);
        foldingBack.half.removeEventListener("animationend", finish);
        cancelActiveFlip = null;
        resolve(currentCharacter);
      }

      function cancel(character) {
        if (!flipping) return;
        clearActiveTimers();
        flipping = false;
        foldingBack.half.removeEventListener("animationend", finish);
        element.classList.remove("is-flipping-a", "is-flipping-b");
        setCharacter(character);
        cancelActiveFlip = null;
        resolve(currentCharacter);
      }

      cancelActiveFlip = cancel;
      midpointTimer = window.setTimeout(reachMidpoint, safeDuration / 2);
      completionTimer = window.setTimeout(finish, safeDuration + 34);
      foldingBack.half.addEventListener("animationend", finish, { once: true });
    });
  }

  function settle(character) {
    if (destroyed) return;
    if (cancelActiveFlip) cancelActiveFlip(character);
    else setCharacter(character);
  }

  function destroy() {
    if (destroyed) return;
    clearActiveTimers();
    cancelActiveFlip?.(currentCharacter);
    destroyed = true;
    cancelActiveFlip = null;
    element.remove();
  }

  setCharacter(initialCharacter);

  return {
    element,
    flipOnce,
    setCharacter,
    settle,
    destroy,
    get currentCharacter() {
      return currentCharacter;
    },
    get isFlipping() {
      return flipping;
    },
  };
}

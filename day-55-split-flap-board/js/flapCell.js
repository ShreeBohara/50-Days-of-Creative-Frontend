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
  let finishActiveFlip = null;

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
    element.classList.remove("is-flipping");
    void element.offsetWidth;
    element.classList.add("is-flipping");

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
        element.classList.remove("is-flipping");
        setCharacter(nextCharacter);
        foldingBack.half.removeEventListener("animationend", finish);
        finishActiveFlip = null;
        resolve(currentCharacter);
      }

      finishActiveFlip = finish;
      midpointTimer = window.setTimeout(reachMidpoint, safeDuration / 2);
      completionTimer = window.setTimeout(finish, safeDuration + 34);
      foldingBack.half.addEventListener("animationend", finish, { once: true });
    });
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearActiveTimers();
    finishActiveFlip?.();
    finishActiveFlip = null;
    element.remove();
  }

  setCharacter(initialCharacter);

  return {
    element,
    flipOnce,
    setCharacter,
    destroy,
    get currentCharacter() {
      return currentCharacter;
    },
    get isFlipping() {
      return flipping;
    },
  };
}

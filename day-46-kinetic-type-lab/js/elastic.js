/* 04 · ELASTIC — grab the word, pull, and let go; letters stretch
   apart from the grab point and snap back with overshoot.

   Technique notes:
   - Draggable runs on an invisible PROXY div with the headline as
     trigger — the visible element never gets Draggable's transform,
     the letters just respond to the pull vector.
   - Each letter follows pull · weight, where weight falls off with
     distance from the grab point — that differential is the stretch.
   - The drag loop and the release tween must never fight: the loop
     only runs while dragging, and a fresh press kills any in-flight
     snap-back tween (letters ease from wherever they are — no jump). */

const FALLOFF = 120; // px — how quickly the pull fades along the word
const SMOOTH = 0.35; // per-frame catch-up while dragging (weighted lag)

export function initElastic(section) {
  const word = section.querySelector(".elastic-word");
  const text = word.getAttribute("aria-label") || word.textContent.trim();

  word.textContent = "";
  const letters = [...text].map((ch) => {
    const s = document.createElement("span");
    s.className = "ltr";
    s.textContent = ch;
    s.setAttribute("aria-hidden", "true");
    word.appendChild(s);
    return s;
  });

  /* Keyboard users get the same toy: focus + Enter/Space flings it */
  word.setAttribute("tabindex", "0");
  word.setAttribute("role", "img");

  const setters = letters.map((el) => ({
    x: gsap.quickSetter(el, "x", "px"),
    y: gsap.quickSetter(el, "y", "px"),
  }));
  const state = letters.map(() => ({ x: 0, y: 0 }));
  let weights = letters.map(() => 0);
  let grabbedIndex = Math.floor(letters.length / 2);
  const pull = { x: 0, y: 0 };

  function computeWeights(grabViewportX) {
    weights = letters.map((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - grabViewportX);
      return 1 / (1 + d / FALLOFF);
    });
    grabbedIndex = weights.indexOf(Math.max(...weights));
  }

  function dragLoop() {
    for (let i = 0; i < letters.length; i++) {
      const st = state[i];
      st.x += (pull.x * weights[i] - st.x) * SMOOTH;
      st.y += (pull.y * weights[i] - st.y) * SMOOTH;
      setters[i].x(st.x);
      setters[i].y(st.y);
    }
  }

  function snapBack() {
    gsap.to(letters, {
      x: 0,
      y: 0,
      duration: 1.4,
      ease: "elastic.out(1, 0.35)",
      stagger: { each: 0.02, from: grabbedIndex },
      overwrite: "auto",
    });
  }

  const proxy = document.createElement("div");

  Draggable.create(proxy, {
    type: "x,y",
    trigger: word,
    onPress() {
      /* Take authority: stop any in-flight snap-back and pick up the
         letters from their CURRENT positions so nothing jumps. */
      gsap.killTweensOf(letters);
      letters.forEach((el, i) => {
        state[i].x = gsap.getProperty(el, "x");
        state[i].y = gsap.getProperty(el, "y");
      });
      gsap.set(proxy, { x: 0, y: 0 });
      this.update(); // re-sync Draggable with the reset proxy
      pull.x = 0;
      pull.y = 0;
      computeWeights(this.pointerX);
      gsap.ticker.add(dragLoop);
    },
    onDrag() {
      pull.x = this.x;
      pull.y = this.y;
    },
    onRelease() {
      gsap.ticker.remove(dragLoop); // hand authority to the spring
      snapBack();
    },
  });

  /* Canned stretch-and-fling for keyboard interaction */
  function playCanned() {
    gsap.killTweensOf(letters);
    const r = letters[grabbedIndex].getBoundingClientRect();
    computeWeights(r.left + r.width / 2);
    const fake = { x: 0, y: 0 };
    gsap
      .timeline()
      .to(fake, {
        x: 120,
        y: -70,
        duration: 0.28,
        ease: "power2.out",
        onUpdate: () => {
          for (let i = 0; i < letters.length; i++) {
            setters[i].x(fake.x * weights[i]);
            setters[i].y(fake.y * weights[i]);
          }
        },
      })
      .add(snapBack);
  }

  word.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      playCanned();
    }
  });
}

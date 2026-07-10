// sync.js — the renderer. Physics bodies are invisible; each one drives a real
// DOM element, repositioned every engine tick. Text stays crisp and real.

export function createSync(world, stage) {
  const items = []; // { body, el, w, h, home }

  function register(item) {
    item.el.classList.add("phys");
    item.el.style.width = `${item.w}px`;
    item.el.style.height = `${item.h}px`;
    stage.append(item.el);
    items.push(item);
    return item;
  }

  function render() {
    for (const { body, el, w, h } of items) {
      const x = body.position.x - w / 2;
      const y = body.position.y - h / 2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
    }
  }

  world.onTick(render);

  return { register, items, render };
}

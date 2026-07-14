import { centerLine } from "./clockMode.js";
import { wrapMessage } from "./messageMode.js";

export const PLATFORM_QUOTES = Object.freeze([
  "EVERY ARRIVAL BEGINS SOMEWHERE ELSE",
  "THE NEXT TRAIN IS ALWAYS A NEW DIRECTION",
  "LEAVE ROOM FOR THE UNPLANNED ROUTE",
  "DISTANCE TURNS WINDOWS INTO STORIES",
  "CITIES CHANGE WHEN WE ARRIVE CURIOUS",
  "A PLATFORM IS A PROMISE IN BOTH DIRECTIONS",
]);

export function formatQuoteBoard(quote, columns) {
  const composition = wrapMessage(quote, { columns, rows: 5 });
  const quoteLines = composition.lines.map((line) => centerLine(line, columns));
  const topPadding = Math.max(0, Math.floor((5 - quoteLines.length) / 2));
  const lines = [
    ...Array.from({ length: topPadding }, () => ""),
    ...quoteLines,
  ];
  while (lines.length < 5) lines.push("");
  return [...lines.slice(0, 5), centerLine("PLATFORM 55", columns)];
}

export function createQuotesMode(options) {
  const setTimeoutFn = options.setTimeoutFn ?? window.setTimeout.bind(window);
  const clearTimeoutFn = options.clearTimeoutFn ?? window.clearTimeout.bind(window);
  const quotes = options.quotes ?? PLATFORM_QUOTES;
  let quoteIndex = 0;
  let active = false;
  let hidden = false;
  let timer = 0;
  let epoch = 0;

  function clearTimer() {
    clearTimeoutFn(timer);
    timer = 0;
  }

  function render() {
    const lines = formatQuoteBoard(quotes[quoteIndex], options.getColumns());
    options.setBoard(lines);
    return lines;
  }

  function scheduleNext() {
    clearTimer();
    if (!active || hidden) return;
    const scheduledEpoch = epoch;
    timer = setTimeoutFn(() => {
      if (!active || hidden || scheduledEpoch !== epoch) return;
      quoteIndex = (quoteIndex + 1) % quotes.length;
      render();
      options.announce?.(`Platform 55 dispatch. ${quotes[quoteIndex]}`);
      scheduleNext();
    }, 12000);
  }

  return {
    activate() {
      active = true;
      epoch += 1;
      const lines = render();
      scheduleNext();
      return lines;
    },
    deactivate() {
      active = false;
      epoch += 1;
      clearTimer();
    },
    resize() {
      return active ? render() : formatQuoteBoard(quotes[quoteIndex], options.getColumns());
    },
    setHidden(nextHidden) {
      hidden = Boolean(nextHidden);
      epoch += 1;
      clearTimer();
      if (active && !hidden) {
        render();
        scheduleNext();
      }
    },
    destroy() {
      active = false;
      epoch += 1;
      clearTimer();
    },
    get quoteIndex() {
      return quoteIndex;
    },
  };
}

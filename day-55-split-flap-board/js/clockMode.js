const WEEKDAYS = Object.freeze(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
const MONTHS = Object.freeze(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]);

function padNumber(value) {
  return String(value).padStart(2, "0");
}

export function centerLine(value, columns) {
  const safeColumns = Math.max(1, Number(columns) || 22);
  const text = String(value ?? "").toUpperCase().slice(0, safeColumns);
  const left = Math.floor((safeColumns - text.length) / 2);
  return `${" ".repeat(left)}${text}`.padEnd(safeColumns, " ");
}

export function formatClockTime(date = new Date()) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
}

export function formatClockDate(date = new Date()) {
  return `${WEEKDAYS[date.getDay()]} ${padNumber(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

export function formatClockBoard(date, columns) {
  return [
    centerLine("LOCAL TIME", columns),
    "",
    centerLine(formatClockTime(date), columns),
    centerLine(formatClockDate(date), columns),
    "",
    centerLine("TERMINAL 55", columns),
  ];
}

export function millisecondsToNextSecond(timestamp) {
  const safeTimestamp = Number(timestamp) || 0;
  return 1000 - (safeTimestamp % 1000) + 5;
}

export function createClockMode(options) {
  const setTimeoutFn = options.setTimeoutFn ?? window.setTimeout.bind(window);
  const clearTimeoutFn = options.clearTimeoutFn ?? window.clearTimeout.bind(window);
  const now = options.now ?? (() => new Date());
  let active = false;
  let hidden = false;
  let timer = 0;
  let epoch = 0;

  function clearTimer() {
    clearTimeoutFn(timer);
    timer = 0;
  }

  function render() {
    const date = now();
    const lines = formatClockBoard(date, options.getColumns());
    options.setBoard(lines);
    return { date, lines };
  }

  function scheduleNext() {
    clearTimer();
    if (!active || hidden) return;
    const date = now();
    const scheduledEpoch = epoch;
    timer = setTimeoutFn(() => {
      if (!active || hidden || scheduledEpoch !== epoch) return;
      render();
      scheduleNext();
    }, millisecondsToNextSecond(date.getTime()));
  }

  return {
    activate() {
      active = true;
      epoch += 1;
      const result = render();
      scheduleNext();
      return result.lines;
    },
    deactivate() {
      active = false;
      epoch += 1;
      clearTimer();
    },
    resize() {
      return active ? render().lines : formatClockBoard(now(), options.getColumns());
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
  };
}

export const DEPARTURE_STATUSES = Object.freeze(["ON TIME", "BOARDING", "DELAYED"]);

export const DEFAULT_DEPARTURES = Object.freeze([
  Object.freeze({ time: "06:40", destination: "BERLIN", code: "BER", status: "ON TIME" }),
  Object.freeze({ time: "07:15", destination: "NEWYORK", code: "NYC", status: "BOARDING" }),
  Object.freeze({ time: "08:05", destination: "LISBON", code: "LIS", status: "ON TIME" }),
  Object.freeze({ time: "09:20", destination: "TOKYO", code: "TYO", status: "DELAYED" }),
  Object.freeze({ time: "10:10", destination: "VIENNA", code: "VIE", status: "ON TIME" }),
  Object.freeze({ time: "11:35", destination: "SEATTLE", code: "SEA", status: "BOARDING" }),
]);

const STATUS_CODES = Object.freeze({
  "ON TIME": Object.freeze({ medium: "ONT", compact: "OK" }),
  BOARDING: Object.freeze({ medium: "BRD", compact: "BD" }),
  DELAYED: Object.freeze({ medium: "DLY", compact: "DL" }),
});

export function formatDepartureLine(service, columns) {
  if (columns >= 22) {
    return `${service.time} ${service.destination.slice(0, 7).padEnd(7)} ${service.status.padEnd(8)}`;
  }
  if (columns >= 16) {
    return `${service.time} ${service.destination.slice(0, 6).padEnd(6)} ${STATUS_CODES[service.status].medium}`;
  }
  return `${service.time} ${service.code.slice(0, 3).padEnd(3)} ${STATUS_CODES[service.status].compact}`;
}

export function formatDepartures(services, columns) {
  return services.map((service) => formatDepartureLine(service, columns));
}

export function chooseNextStatus(currentStatus, random = Math.random) {
  const choices = DEPARTURE_STATUSES.filter((status) => status !== currentStatus);
  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length));
  return choices[Math.max(0, index)];
}

export function updateRandomDeparture(services, random = Math.random) {
  if (!services.length) return { services: [], index: -1, previousStatus: null, nextStatus: null };
  const index = Math.min(services.length - 1, Math.max(0, Math.floor(random() * services.length)));
  const previousStatus = services[index].status;
  const nextStatus = chooseNextStatus(previousStatus, random);
  const nextServices = services.map((service, serviceIndex) => (
    serviceIndex === index ? { ...service, status: nextStatus } : { ...service }
  ));
  return { services: nextServices, index, previousStatus, nextStatus };
}

export function createDeparturesMode(options) {
  const setTimeoutFn = options.setTimeoutFn ?? window.setTimeout.bind(window);
  const clearTimeoutFn = options.clearTimeoutFn ?? window.clearTimeout.bind(window);
  const random = options.random ?? Math.random;
  let services = (options.services ?? DEFAULT_DEPARTURES).map((service) => ({ ...service }));
  let active = false;
  let hidden = false;
  let timer = 0;
  let epoch = 0;

  function clearTimer() {
    clearTimeoutFn(timer);
    timer = 0;
  }

  function render() {
    const lines = formatDepartures(services, options.getColumns());
    options.setBoard(lines);
    return lines;
  }

  function scheduleNext() {
    clearTimer();
    if (!active || hidden) return;
    const scheduledEpoch = epoch;
    timer = setTimeoutFn(() => {
      if (!active || hidden || scheduledEpoch !== epoch) return;
      const update = updateRandomDeparture(services, random);
      services = update.services;
      render();
      const service = services[update.index];
      options.announce?.(`${service.time} service to ${service.destination} now ${service.status}`);
      scheduleNext();
    }, 8000);
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
      return active ? render() : formatDepartures(services, options.getColumns());
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
    get services() {
      return services.map((service) => ({ ...service }));
    },
  };
}

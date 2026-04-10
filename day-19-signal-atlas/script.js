/* Day 19 — Signal Atlas */

(() => {
  "use strict";

  const canvas = document.getElementById("atlas-canvas");
  const ctx = canvas.getContext("2d");

  const hubName = document.getElementById("hub-name");
  const hubRegion = document.getElementById("hub-region");
  const hubScore = document.getElementById("hub-score");
  const hubScoreFill = document.getElementById("hub-score-fill");
  const hubBlurb = document.getElementById("hub-blurb");
  const hubRouteTotal = document.getElementById("hub-route-total");
  const hubLatitude = document.getElementById("hub-latitude");
  const hubLongitude = document.getElementById("hub-longitude");
  const routeStatus = document.getElementById("route-status");
  const routeList = document.getElementById("route-list");
  const hubButtons = document.getElementById("hub-buttons");
  const hubSelect = document.getElementById("hub-select");
  const selectionAnnouncer = document.getElementById("selection-announcer");
  const hubCountLabel = document.getElementById("hub-count-label");
  const routeCountLabel = document.getElementById("route-count-label");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const HUBS = [
    {
      id: "san-francisco",
      city: "San Francisco",
      region: "North America",
      lat: 37.7749,
      lon: -122.4194,
      signal: 96,
      blurb: "West-coast relay balancing product launch traffic and Pacific corridor handoffs.",
      routes: ["tokyo", "singapore", "sao-paulo"],
    },
    {
      id: "tokyo",
      city: "Tokyo",
      region: "East Asia",
      lat: 35.6762,
      lon: 139.6503,
      signal: 94,
      blurb: "A high-density node tuned for overnight dispatches, finance bursts, and low-latency edge sync.",
      routes: ["san-francisco", "singapore", "helsinki", "dubai"],
    },
    {
      id: "singapore",
      city: "Singapore",
      region: "Southeast Asia",
      lat: 1.3521,
      lon: 103.8198,
      signal: 98,
      blurb: "The cleanest exchange in the lattice, routing equatorial traffic through the network core.",
      routes: ["tokyo", "dubai", "lagos", "san-francisco"],
    },
    {
      id: "dubai",
      city: "Dubai",
      region: "Middle East",
      lat: 25.2048,
      lon: 55.2708,
      signal: 91,
      blurb: "Desert-band relay smoothing daytime surges between Europe, Asia, and the Gulf corridor.",
      routes: ["singapore", "helsinki", "lagos", "tokyo"],
    },
    {
      id: "helsinki",
      city: "Helsinki",
      region: "Northern Europe",
      lat: 60.1699,
      lon: 24.9384,
      signal: 89,
      blurb: "Cold-climate backbone node handling resilient routing for high-latitude traffic windows.",
      routes: ["tokyo", "dubai", "reykjavik"],
    },
    {
      id: "reykjavik",
      city: "Reykjavik",
      region: "North Atlantic",
      lat: 64.1466,
      lon: -21.9426,
      signal: 86,
      blurb: "Polar hinge keeping transatlantic spillover stable when the western lanes spike.",
      routes: ["helsinki", "sao-paulo"],
    },
    {
      id: "sao-paulo",
      city: "Sao Paulo",
      region: "South America",
      lat: -23.5505,
      lon: -46.6333,
      signal: 92,
      blurb: "Southern megacity channel absorbing commerce-heavy bursts from Atlantic and Pacific relays.",
      routes: ["reykjavik", "lagos", "san-francisco"],
    },
    {
      id: "lagos",
      city: "Lagos",
      region: "West Africa",
      lat: 6.5244,
      lon: 3.3792,
      signal: 90,
      blurb: "A fast-growing coastal exchange keeping equatorial handoffs warm, quick, and steady.",
      routes: ["sao-paulo", "dubai", "singapore"],
    },
  ];

  HUBS.forEach((hub) => {
    hub.vector = latLonToVector(hub.lat, hub.lon);
  });

  const HUB_LOOKUP = new Map(HUBS.map((hub) => [hub.id, hub]));
  const ROUTES = buildRoutes(HUBS);
  const seededRandom = mulberry32(19019);
  const SURFACE_POINTS = buildSurfacePoints(seededRandom);

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    centerX: 0,
    centerY: 0,
    radius: 0,
    rotationY: degToRad(-18),
    rotationX: degToRad(-16),
    velocityY: 0,
    velocityX: 0,
    lastTime: performance.now(),
    pointerId: null,
    dragging: false,
    dragMoved: false,
    lastPointerX: 0,
    lastPointerY: 0,
    selectedHubId: "singapore",
    hoveredHubId: null,
    projectedHubs: new Map(),
    stars: [],
    reducedMotion: motionQuery.matches,
  };

  hubCountLabel.textContent = `${HUBS.length} hubs`;
  routeCountLabel.textContent = `${ROUTES.length} corridors`;

  createHubControls();
  selectHub(state.selectedHubId, false);
  resize();
  installListeners();

  requestAnimationFrame((time) => {
    state.lastTime = time;
    document.body.classList.add("is-ready");
    render(time);
  });

  function createHubControls() {
    const buttonFragment = document.createDocumentFragment();
    const selectFragment = document.createDocumentFragment();

    for (const hub of HUBS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hub-button";
      button.dataset.id = hub.id;
      button.setAttribute("aria-pressed", "false");

      const city = document.createElement("span");
      city.className = "hub-button__city";
      city.textContent = hub.city;

      const region = document.createElement("span");
      region.className = "hub-button__region";
      region.textContent = hub.region;

      button.append(city, region);
      buttonFragment.append(button);

      const option = document.createElement("option");
      option.value = hub.id;
      option.textContent = `${hub.city} - ${hub.region}`;
      selectFragment.append(option);
    }

    hubButtons.append(buttonFragment);
    hubSelect.append(selectFragment);
  }

  function installListeners() {
    window.addEventListener("resize", resize, { passive: true });

    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", handleReducedMotionChange);
    } else {
      motionQuery.addListener(handleReducedMotionChange);
    }

    hubButtons.addEventListener("click", (event) => {
      const button = event.target.closest(".hub-button");
      if (!button) return;
      selectHub(button.dataset.id);
    });

    hubSelect.addEventListener("change", (event) => {
      selectHub(event.target.value);
    });

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", () => {
      if (!state.dragging) {
        state.hoveredHubId = null;
        updateCanvasCursor();
      }
    });
  }

  function handleReducedMotionChange(event) {
    state.reducedMotion = event.matches;
    if (state.reducedMotion) {
      state.velocityY = 0;
      state.velocityX = 0;
    }
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;

    const desktop = state.width > 760;
    state.centerX = desktop ? state.width * 0.54 : state.width * 0.5;
    state.centerY = desktop ? state.height * 0.53 : state.height * 0.41;
    state.radius = desktop
      ? Math.min(state.height * 0.35, state.width * 0.24, 340)
      : Math.min(state.width * 0.38, state.height * 0.22, 230);

    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.stars = buildStars();
  }

  function onPointerDown(event) {
    state.dragging = true;
    state.dragMoved = false;
    state.pointerId = event.pointerId;
    state.lastPointerX = event.clientX;
    state.lastPointerY = event.clientY;
    state.velocityX = 0;
    state.velocityY = 0;
    canvas.setPointerCapture(event.pointerId);
    document.body.classList.add("is-dragging");
    updateCanvasCursor();
  }

  function onPointerMove(event) {
    if (state.dragging && event.pointerId === state.pointerId) {
      const dx = event.clientX - state.lastPointerX;
      const dy = event.clientY - state.lastPointerY;

      if (Math.abs(dx) + Math.abs(dy) > 1.5) {
        state.dragMoved = true;
      }

      state.rotationY += dx * 0.0064;
      state.rotationX = clamp(state.rotationX + dy * 0.0048, degToRad(-38), degToRad(38));

      if (!state.reducedMotion) {
        state.velocityY = dx * 0.00008;
        state.velocityX = dy * 0.00006;
      }

      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      updateHover(event.clientX, event.clientY);
      return;
    }

    updateHover(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    if (event.pointerId !== state.pointerId) return;

    const hit = pickHub(event.clientX, event.clientY);

    if (!state.dragMoved && hit) {
      selectHub(hit.id);
    }

    state.dragging = false;
    state.pointerId = null;
    document.body.classList.remove("is-dragging");
    updateCanvasCursor();

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (state.reducedMotion) {
      state.velocityY = 0;
      state.velocityX = 0;
    }
  }

  function updateHover(clientX, clientY) {
    const hit = pickHub(clientX, clientY);
    state.hoveredHubId = hit ? hit.id : null;
    updateCanvasCursor();
  }

  function pickHub(clientX, clientY) {
    const threshold = state.width > 760 ? 20 : 26;
    let nearest = null;

    for (const point of state.projectedHubs.values()) {
      if (!point.visible) continue;

      const distance = Math.hypot(clientX - point.x, clientY - point.y);
      if (distance > threshold) continue;

      if (!nearest || distance < nearest.distance) {
        nearest = { id: point.id, distance };
      }
    }

    return nearest;
  }

  function selectHub(id, announce = true) {
    const hub = HUB_LOOKUP.get(id);
    if (!hub) return;

    state.selectedHubId = hub.id;
    hubName.textContent = hub.city;
    hubRegion.textContent = hub.region;
    hubScore.textContent = `${hub.signal}`;
    hubScoreFill.style.width = `${hub.signal}%`;
    hubBlurb.textContent = hub.blurb;
    hubRouteTotal.textContent = `${hub.routes.length}`;
    hubLatitude.textContent = formatCoordinate(hub.lat, "N", "S");
    hubLongitude.textContent = formatCoordinate(hub.lon, "E", "W");
    routeStatus.textContent = `${hub.routes.length} online`;
    hubSelect.value = hub.id;

    for (const button of hubButtons.querySelectorAll(".hub-button")) {
      const active = button.dataset.id === hub.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }

    const connectedHubs = hub.routes.map((targetId) => HUB_LOOKUP.get(targetId)).filter(Boolean);
    const routeItems = connectedHubs.map((targetHub) => {
      const item = document.createElement("li");

      const meta = document.createElement("div");
      meta.className = "route-meta";

      const city = document.createElement("p");
      city.className = "route-city";
      city.textContent = targetHub.city;

      const region = document.createElement("p");
      region.className = "route-region";
      region.textContent = targetHub.region;

      const score = document.createElement("p");
      score.className = "route-score";
      score.textContent = corridorLabel(hub.signal, targetHub.signal);

      meta.append(city, region);
      item.append(meta, score);
      return item;
    });

    routeList.replaceChildren(...routeItems);

    if (announce) {
      selectionAnnouncer.textContent = `${hub.city} selected. ${hub.routes.length} connected routes online.`;
    }
  }

  function render(time) {
    const elapsed = Math.min(time - state.lastTime, 40);
    const delta = elapsed / 16.667;
    state.lastTime = time;

    updateMotion(elapsed, delta);

    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground(time);
    drawGlobe(time);
    drawRoutes(time);
    drawHubs(time);

    requestAnimationFrame(render);
  }

  function updateMotion(elapsed, delta) {
    const autoSpin = state.reducedMotion ? 0.000008 : 0.000026;
    state.rotationY += autoSpin * elapsed;

    if (!state.dragging) {
      state.rotationY += state.velocityY * elapsed;
      state.rotationX = clamp(
        state.rotationX + state.velocityX * elapsed,
        degToRad(-38),
        degToRad(38)
      );

      const damping = state.reducedMotion ? Math.pow(0.45, delta) : Math.pow(0.9, delta);
      state.velocityY *= damping;
      state.velocityX *= damping;
    }
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#02070d");
    gradient.addColorStop(0.5, "#041018");
    gradient.addColorStop(1, "#02080f");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    for (const star of state.stars) {
      const pulse = state.reducedMotion
        ? 1
        : 0.55 + 0.45 * Math.sin(time * 0.00055 * star.speed + star.phase);

      ctx.fillStyle = `rgba(209, 236, 255, ${star.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGlobe(time) {
    const halo = ctx.createRadialGradient(
      state.centerX,
      state.centerY,
      state.radius * 0.64,
      state.centerX,
      state.centerY,
      state.radius * 1.34
    );
    halo.addColorStop(0, "rgba(77, 213, 255, 0.18)");
    halo.addColorStop(0.6, "rgba(49, 160, 213, 0.08)");
    halo.addColorStop(1, "rgba(49, 160, 213, 0)");

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(state.centerX, state.centerY, state.radius * 1.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(state.centerX, state.centerY, state.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.shadowColor = "rgba(43, 196, 255, 0.26)";
    ctx.shadowBlur = 40;

    const sphereGradient = ctx.createRadialGradient(
      state.centerX - state.radius * 0.22,
      state.centerY - state.radius * 0.3,
      state.radius * 0.18,
      state.centerX,
      state.centerY,
      state.radius * 1.05
    );
    sphereGradient.addColorStop(0, "#163449");
    sphereGradient.addColorStop(0.45, "#0b1f2d");
    sphereGradient.addColorStop(1, "#041018");
    ctx.fillStyle = sphereGradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(state.centerX, state.centerY, state.radius, 0, Math.PI * 2);
    ctx.clip();

    const shadowX = state.centerX - Math.cos(state.rotationY + Math.PI * 0.35) * state.radius * 0.65;
    const shadowGradient = ctx.createLinearGradient(
      shadowX,
      state.centerY - state.radius,
      state.centerX + state.radius,
      state.centerY + state.radius * 0.65
    );
    shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0.56)");
    shadowGradient.addColorStop(0.4, "rgba(0, 0, 0, 0.12)");
    shadowGradient.addColorStop(1, "rgba(92, 229, 255, 0.08)");
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(
      state.centerX - state.radius,
      state.centerY - state.radius,
      state.radius * 2,
      state.radius * 2
    );

    drawGraticule();
    drawSurfaceSignals(time);

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(138, 241, 255, 0.36)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(138, 241, 255, 0.28)";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(state.centerX, state.centerY, state.radius + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGraticule() {
    const latitudes = [-60, -30, 0, 30, 60];
    const longitudes = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

    for (const lat of latitudes) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 6) {
        points.push(projectVector(latLonToVector(lat, lon)));
      }

      drawLineSegments(points, {
        strokeStyle: lat === 0 ? "rgba(138, 241, 255, 0.18)" : "rgba(138, 241, 255, 0.1)",
        lineWidth: lat === 0 ? 1.2 : 0.8,
        threshold: -0.03,
      });
    }

    for (const lon of longitudes) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 4) {
        points.push(projectVector(latLonToVector(lat, lon)));
      }

      drawLineSegments(points, {
        strokeStyle: "rgba(138, 241, 255, 0.08)",
        lineWidth: 0.75,
        threshold: -0.03,
      });
    }
  }

  function drawSurfaceSignals(time) {
    for (const point of SURFACE_POINTS) {
      const projected = projectVector(point.vector);
      if (projected.depth <= 0.02) continue;

      const pulse = state.reducedMotion
        ? 1
        : 0.72 + 0.28 * Math.sin(time * 0.0011 * point.speed + point.phase);

      ctx.fillStyle = `rgba(137, 239, 255, ${point.alpha * pulse * projected.fade})`;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, point.size * projected.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoutes(time) {
    const focusHubId = state.hoveredHubId || state.selectedHubId;

    for (const route of ROUTES) {
      const emphasized = route.from === focusHubId || route.to === focusHubId;
      const path = buildRoutePath(route);
      drawLineSegments(path, {
        strokeStyle: emphasized
          ? "rgba(137, 239, 255, 0.58)"
          : "rgba(137, 239, 255, 0.18)",
        lineWidth: emphasized ? 1.8 : 1,
        threshold: -0.01,
      });

      const pulseCount = emphasized ? 2 : 1;
      for (let index = 0; index < pulseCount; index += 1) {
        drawRoutePulse(route, time, emphasized, index);
      }
    }
  }

  function drawRoutePulse(route, time, emphasized, pulseIndex) {
    const speed = emphasized ? 0.00016 : 0.00009;
    const progress = state.reducedMotion
      ? 0.48 + pulseIndex * 0.1
      : (time * speed + route.offset + pulseIndex * 0.22) % 1;

    const point = sampleRoute(route, progress);
    if (point.depth <= 0.05) return;

    ctx.save();
    ctx.fillStyle = emphasized
      ? "rgba(195, 250, 255, 0.96)"
      : "rgba(137, 239, 255, 0.6)";
    ctx.shadowColor = emphasized
      ? "rgba(137, 239, 255, 0.88)"
      : "rgba(137, 239, 255, 0.46)";
    ctx.shadowBlur = emphasized ? 18 : 10;
    ctx.beginPath();
    ctx.arc(point.x, point.y, emphasized ? 3.4 : 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHubs(time) {
    const hubs = HUBS.map((hub) => {
      const projected = projectVector(hub.vector, 0.014);
      const visible = projected.depth > 0;

      state.projectedHubs.set(hub.id, {
        id: hub.id,
        x: projected.x,
        y: projected.y,
        visible,
      });

      return { hub, projected, visible };
    }).sort((left, right) => left.projected.depth - right.projected.depth);

    for (const entry of hubs) {
      if (!entry.visible) continue;

      const isSelected = entry.hub.id === state.selectedHubId;
      const isHovered = entry.hub.id === state.hoveredHubId;
      const glow = isSelected ? 18 : isHovered ? 12 : 8;
      const radius = (isSelected ? 4.6 : isHovered ? 3.9 : 3.1) * entry.projected.scale;

      if (!state.reducedMotion && (isSelected || isHovered)) {
        const pulse = 1 + 0.16 * Math.sin(time * 0.004 + entry.hub.signal);
        ctx.save();
        ctx.strokeStyle = isSelected
          ? "rgba(195, 250, 255, 0.5)"
          : "rgba(137, 239, 255, 0.36)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(entry.projected.x, entry.projected.y, radius * 2.6 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = isSelected ? "#f4feff" : isHovered ? "#c8fbff" : "#89efff";
      ctx.shadowColor = "rgba(137, 239, 255, 0.8)";
      ctx.shadowBlur = glow;
      ctx.beginPath();
      ctx.arc(entry.projected.x, entry.projected.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (isSelected || isHovered) {
        drawHubLabel(entry.hub, entry.projected, isSelected);
      }
    }
  }

  function drawHubLabel(hub, projected, isSelected) {
    ctx.save();
    ctx.font = `${isSelected ? 700 : 600} 13px Manrope`;
    const textWidth = ctx.measureText(hub.city).width;
    let labelX = projected.x + 12;
    let labelY = projected.y - 12;
    let textAlign = "left";

    if (labelX + textWidth > state.width - 14) {
      labelX = projected.x - 12;
      textAlign = "right";
    }

    if (labelY < 18) {
      labelY = projected.y + 16;
    }

    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(245, 252, 255, 0.94)";
    ctx.strokeStyle = "rgba(2, 9, 15, 0.72)";
    ctx.lineWidth = 4;
    ctx.strokeText(hub.city, labelX, labelY);
    ctx.fillText(hub.city, labelX, labelY);
    ctx.restore();
  }

  function buildRoutePath(route) {
    const points = [];
    const segments = 42;

    // Interpolate the route in 3D before projection so every corridor hugs the sphere.
    for (let step = 0; step <= segments; step += 1) {
      const progress = step / segments;
      points.push(sampleRoute(route, progress));
    }

    return points;
  }

  function sampleRoute(route, progress) {
    const arc = slerp(route.fromVector, route.toVector, progress);
    const altitude = Math.sin(Math.PI * progress) * route.height;
    return projectVector(arc, altitude);
  }

  function drawLineSegments(points, options) {
    const { strokeStyle, lineWidth, threshold } = options;

    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    let segmentOpen = false;

    for (const point of points) {
      if (point.depth > threshold) {
        if (!segmentOpen) {
          ctx.moveTo(point.x, point.y);
          segmentOpen = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      } else {
        segmentOpen = false;
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  function projectVector(vector, altitude = 0) {
    const scaled = {
      x: vector.x * (1 + altitude),
      y: vector.y * (1 + altitude),
      z: vector.z * (1 + altitude),
    };

    const cosY = Math.cos(state.rotationY);
    const sinY = Math.sin(state.rotationY);
    const cosX = Math.cos(state.rotationX);
    const sinX = Math.sin(state.rotationX);

    const rotatedX = scaled.x * cosY + scaled.z * sinY;
    const rotatedZ = scaled.z * cosY - scaled.x * sinY;
    const rotatedY = scaled.y * cosX - rotatedZ * sinX;
    const depth = scaled.y * sinX + rotatedZ * cosX;

    const x = state.centerX + rotatedX * state.radius;
    const y = state.centerY - rotatedY * state.radius;
    const scale = 0.72 + Math.max(depth, -0.1) * 0.28;
    const fade = 0.2 + (depth + 1) * 0.4;

    return { x, y, depth, scale, fade };
  }

  function buildRoutes(hubs) {
    const routes = [];
    const seen = new Set();

    for (const hub of hubs) {
      for (const targetId of hub.routes) {
        const pairKey = [hub.id, targetId].sort().join(":");
        if (seen.has(pairKey)) continue;

        const targetHub = HUB_LOOKUP.get(targetId);
        if (!targetHub) continue;

        seen.add(pairKey);
        const dot =
          hub.vector.x * targetHub.vector.x +
          hub.vector.y * targetHub.vector.y +
          hub.vector.z * targetHub.vector.z;
        const distance = Math.acos(clamp(dot, -1, 1));

        routes.push({
          key: pairKey,
          from: hub.id,
          to: targetHub.id,
          fromVector: hub.vector,
          toVector: targetHub.vector,
          offset: routes.length * 0.173,
          height: 0.05 + distance * 0.045,
        });
      }
    }

    return routes;
  }

  function buildSurfacePoints(rng) {
    const points = [];

    for (const hub of HUBS) {
      for (let index = 0; index < 12; index += 1) {
        const lat = hub.lat + randomBetween(rng, -8, 8);
        const lon = hub.lon + randomBetween(rng, -10, 10);
        points.push({
          vector: latLonToVector(lat, lon),
          size: randomBetween(rng, 0.9, 1.7),
          alpha: randomBetween(rng, 0.24, 0.58),
          phase: randomBetween(rng, 0, Math.PI * 2),
          speed: randomBetween(rng, 0.8, 1.8),
        });
      }
    }

    for (let index = 0; index < 96; index += 1) {
      points.push({
        vector: latLonToVector(randomBetween(rng, -65, 72), randomBetween(rng, -180, 180)),
        size: randomBetween(rng, 0.6, 1.35),
        alpha: randomBetween(rng, 0.1, 0.28),
        phase: randomBetween(rng, 0, Math.PI * 2),
        speed: randomBetween(rng, 0.4, 1.2),
      });
    }

    return points;
  }

  function buildStars() {
    const rng = mulberry32(Math.round(state.width * 10 + state.height));
    const count = Math.max(120, Math.floor((state.width * state.height) / 16000));

    return Array.from({ length: count }, () => ({
      x: randomBetween(rng, 0, state.width),
      y: randomBetween(rng, 0, state.height),
      radius: randomBetween(rng, 0.45, 1.7),
      alpha: randomBetween(rng, 0.18, 0.55),
      phase: randomBetween(rng, 0, Math.PI * 2),
      speed: randomBetween(rng, 0.45, 1.8),
    }));
  }

  function corridorLabel(originSignal, targetSignal) {
    const average = Math.round((originSignal + targetSignal) * 0.5);
    return `${average} / Prime corridor`;
  }

  function formatCoordinate(value, positiveLabel, negativeLabel) {
    const absolute = Math.abs(value).toFixed(1);
    const direction = value >= 0 ? positiveLabel : negativeLabel;
    return `${absolute}deg ${direction}`;
  }

  function latLonToVector(latitude, longitude) {
    const lat = degToRad(latitude);
    const lon = degToRad(longitude);
    const cosLat = Math.cos(lat);

    return {
      x: cosLat * Math.sin(lon),
      y: Math.sin(lat),
      z: cosLat * Math.cos(lon),
    };
  }

  function slerp(start, end, progress) {
    const dot = clamp(start.x * end.x + start.y * end.y + start.z * end.z, -1, 1);
    const theta = Math.acos(dot) * progress;

    if (theta === 0) {
      return start;
    }

    const relative = normalizeVector({
      x: end.x - start.x * dot,
      y: end.y - start.y * dot,
      z: end.z - start.z * dot,
    });

    return {
      x: start.x * Math.cos(theta) + relative.x * Math.sin(theta),
      y: start.y * Math.cos(theta) + relative.y * Math.sin(theta),
      z: start.z * Math.cos(theta) + relative.z * Math.sin(theta),
    };
  }

  function normalizeVector(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length,
    };
  }

  function degToRad(value) {
    return (value * Math.PI) / 180;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(rng, min, max) {
    return min + (max - min) * rng();
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = Math.imul(value ^ (value >>> 15), value | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function updateCanvasCursor() {
    if (state.dragging) {
      canvas.style.cursor = "grabbing";
      return;
    }

    canvas.style.cursor = state.hoveredHubId ? "pointer" : "grab";
  }
})();

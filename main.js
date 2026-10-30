(() => {
  const EMAIL = "abhinavc038@gmail.com";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // ---------- small helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  if (isMac) $$("kbd[data-mod]").forEach((k) => (k.textContent = "⌘"));

  // ---------- nav border once the hero meta scrolls away ----------
  const nav = $("#nav");
  new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting))
    .observe($(".hero__meta"));

  // ---------- copy email (silent success: the button says it) ----------
  async function copyEmail(btn) {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
      return;
    }
    if (!btn) return;
    btn.textContent = "Copied ✓";
    btn.classList.add("is-done");
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.textContent = btn.dataset.label;
      btn.classList.remove("is-done");
    }, 1600);
  }
  $$(".copy-email").forEach((b) => b.addEventListener("click", () => copyEmail(b)));

  // ---------- hero x-ray ----------
  const hero = $(".hero");
  const xray = $("#xray");
  const titlewrap = $("#titlewrap");
  const solid = $(".hero__title--solid");
  const ghost = solid.cloneNode(true);
  ghost.removeAttribute("id");
  ghost.className = "hero__title hero__title--ghost";
  ghost.setAttribute("aria-hidden", "true");
  titlewrap.appendChild(ghost);

  const BLUEPRINT = [
    "model Program { id String @id  trainerId String  weeks Week[]  status Status @default(DRAFT) }",
    "POST /auth/otp/verify  ->  { accessToken, refreshToken: httpOnly }",
    "@UseGuards(JwtAuthGuard, RolesGuard)  @Roles(Role.TRAINER)",
    "socket.on('message:read')  ->  queryClient.setQueryData(['thread', id], patch)",
    "gemini.generate({ file: pdf, responseSchema: ProgramDraftDto })",
    "fuzzyMatch(name, library /* 873 exercises */)  ->  exerciseId | needsReview",
    "r2.presign('PUT', `clients/${id}/form/${uuid}.mp4`, { expiresIn: 300 })",
    "razorpay.webhook(evt)  ->  idempotent(evt.id)  ->  ledger.append()",
    "balance = sum(ledger.entries)  // computed at read time, never stored",
    "expo prebuild   vite build   railway up   prisma migrate deploy",
    "describe('PaymentsService')  it('ignores a replayed webhook')  ✓ 216 passing",
  ];
  function fillBlueprint() {
    const lineH = 22.8; // 0.75rem * 1.9
    const rows = Math.ceil(hero.offsetHeight / lineH) + 2;
    let out = "";
    for (let i = 0; i < rows; i++) {
      const a = BLUEPRINT[i % BLUEPRINT.length];
      const b = BLUEPRINT[(i * 7 + 3) % BLUEPRINT.length];
      out += `${a}     ${b}     ${a}\n`;
    }
    $$(".xray", xray).forEach((p) => (p.textContent = out));
  }
  fillBlueprint();

  let px = 0, py = 0, raf = 0;
  function paintXray() {
    raf = 0;
    const h = hero.getBoundingClientRect();
    const t = titlewrap.getBoundingClientRect();
    xray.style.setProperty("--mx", `${px - h.left}px`);
    xray.style.setProperty("--my", `${py - h.top}px`);
    titlewrap.style.setProperty("--mx", `${px - t.left}px`);
    titlewrap.style.setProperty("--my", `${py - t.top}px`);
  }
  hero.addEventListener("pointermove", (e) => {
    px = e.clientX; py = e.clientY;
    titlewrap.classList.add("is-xray");
    if (!raf) raf = requestAnimationFrame(paintXray);
  });
  hero.addEventListener("pointerleave", () => {
    titlewrap.classList.remove("is-xray");
    xray.style.removeProperty("--mx");
    xray.style.removeProperty("--my");
  });

  // ---------- system map ----------
  const map = $("#map");
  const svg = $("#wires");
  const packet = $("#packet");
  const traceEl = $("#trace");
  const replayBtn = $("#replay");
  const nodes = Object.fromEntries($$(".node", map).map((n) => [n.dataset.node, n]));

  const EDGES = [
    ["mobile", "api"], ["web", "api"], ["api", "db"], ["api", "r2"],
    ["api", "gemini"], ["api", "pay"], ["mobile", "r2"],
  ];
  const WHO = { mobile: "Mobile app", web: "Web app", api: "API", db: "Postgres", r2: "R2", gemini: "Gemini", pay: "Razorpay" };

  const SCENARIOS = {
    chat: [
      ["mobile", "Client hits send. The message leaves over Socket.IO."],
      ["api", "The socket's JWT and role guard are checked."],
      ["db", "Message written through Prisma, reply thread intact."],
      ["api", "Event fans out to the trainer's room."],
      ["web", "Lands straight in the TanStack Query cache. No refetch."],
    ],
    pdf: [
      ["web", "Trainer drops in a workout plan as a PDF."],
      ["api", "API sends it to Gemini with the DTO as the response schema."],
      ["gemini", "Gemini returns the program as structured JSON."],
      ["api", "A fuzzy matcher maps exercise names onto an 873-exercise library."],
      ["db", "Saved as a draft for the trainer to review."],
    ],
    video: [
      ["mobile", "Client records a form-check video."],
      ["api", "API signs a short-lived upload URL."],
      ["mobile", "The URL comes back to the app."],
      ["r2", "Video goes straight into a private bucket. Playback gets its own short-lived URL."],
    ],
    pay: [
      ["mobile", "Client picks a plan and subscribes."],
      ["api", "API creates a Razorpay subscription (test mode)."],
      ["pay", "Razorpay charges and fires a webhook."],
      ["api", "Webhook verified and handled idempotently. A retry is processed once."],
      ["db", "Ledger entry written. Balances are computed at read time, never stored."],
    ],
  };

  const paths = new Map(); // "a>b" -> SVGPathElement
  const key = (a, b) => `${a}>${b}`;

  function box(el) {
    const m = map.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { l: r.left - m.left, t: r.top - m.top, r: r.right - m.left, b: r.bottom - m.top, w: r.width, h: r.height,
             cx: r.left - m.left + r.width / 2, cy: r.top - m.top + r.height / 2 };
  }

  function blocked(d, a, b) {
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    probe.setAttribute("d", d);
    svg.appendChild(probe);
    const len = probe.getTotalLength();
    const others = Object.entries(nodes).filter(([k]) => k !== a && k !== b).map(([, n]) => box(n));
    let hit = false;
    for (let i = 1; i < 24 && !hit; i++) {
      const p = probe.getPointAtLength((len * i) / 24);
      hit = others.some((o) => p.x > o.l - 8 && p.x < o.r + 8 && p.y > o.t - 8 && p.y < o.b + 8);
    }
    probe.remove();
    return hit;
  }

  function route(a, b) {
    const A = box(nodes[a]);
    const B = box(nodes[b]);
    const singleColumn = getComputedStyle(map).gridTemplateColumns.trim().split(/\s+/).length === 1;

    if (singleColumn) {
      // arc diagram down the left rail: longer hops bulge further out
      const x = A.l;
      const rail = A.l - 6;
      const bulge = Math.min(rail, 10 + Math.abs(B.cy - A.cy) * 0.1);
      return `M ${x} ${A.cy} C ${x - bulge} ${A.cy}, ${x - bulge} ${B.cy}, ${x} ${B.cy}`;
    }

    const leftToRight = B.l > A.r;
    const x1 = leftToRight ? A.r : A.l;
    const x2 = leftToRight ? B.l : B.r;
    const dx = (x2 - x1) * 0.5;
    let d = "";
    for (const lift of [0, -70, 70, -130, 130]) {
      d = `M ${x1} ${A.cy} C ${x1 + dx} ${A.cy + lift}, ${x2 - dx} ${B.cy + lift}, ${x2} ${B.cy}`;
      if (!blocked(d, a, b)) break;
    }
    return d;
  }

  function drawWires() {
    const lit = new Set([...paths].filter(([, p]) => p.classList.contains("is-on")).map(([k]) => k));
    svg.replaceChildren();
    paths.clear();
    svg.setAttribute("viewBox", `0 0 ${map.offsetWidth} ${map.offsetHeight}`);
    for (const [a, b] of EDGES) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", route(a, b));
      p.setAttribute("class", "wire");
      if (lit.has(key(a, b))) p.classList.add("is-on");
      svg.appendChild(p);
      paths.set(key(a, b), p);
    }
  }

  function edgeBetween(a, b) {
    if (paths.has(key(a, b))) return { path: paths.get(key(a, b)), reverse: false };
    if (paths.has(key(b, a))) return { path: paths.get(key(b, a)), reverse: true };
    return null;
  }

  function placePacket(nodeName) {
    const B = box(nodes[nodeName]);
    packet.style.transform = `translate(${B.cx}px, ${B.cy}px)`;
  }

  function travel(edge, ms) {
    return new Promise((resolve) => {
      const len = edge.path.getTotalLength();
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / ms);
        const d = (edge.reverse ? 1 - ease(t) : ease(t)) * len;
        const p = edge.path.getPointAtLength(d);
        packet.style.transform = `translate(${p.x}px, ${p.y}px)`;
        t < 1 ? requestAnimationFrame(step) : resolve();
      };
      requestAnimationFrame(step);
    });
  }

  let runId = 0;
  async function play(name) {
    const id = ++runId;
    const steps = SCENARIOS[name];
    Object.values(nodes).forEach((n) => n.classList.remove("is-on", "is-hot"));
    paths.forEach((p) => p.classList.remove("is-on"));
    traceEl.replaceChildren(...steps.map(([who, text]) => {
      const li = document.createElement("li");
      li.className = "trace__item";
      li.innerHTML = `<span><span class="trace__who"></span><span class="trace__text"></span></span>`;
      li.querySelector(".trace__who").textContent = WHO[who];
      li.querySelector(".trace__text").textContent = text;
      return li;
    }));
    const items = $$(".trace__item", traceEl);
    replayBtn.disabled = true;

    if (reduceMotion.matches) {
      steps.forEach(([who], i) => {
        nodes[who].classList.add("is-on");
        if (i) edgeBetween(steps[i - 1][0], who)?.path.classList.add("is-on");
        items[i].classList.add("is-done");
      });
      replayBtn.disabled = false;
      return;
    }

    packet.classList.add("is-live");
    for (let i = 0; i < steps.length; i++) {
      if (id !== runId) return;
      const who = steps[i][0];
      items.forEach((it) => it.classList.remove("is-current"));
      if (i === 0) {
        placePacket(who);
      } else {
        const edge = edgeBetween(steps[i - 1][0], who);
        if (edge) {
          edge.path.classList.add("is-on");
          await travel(edge, 720);
          if (id !== runId) return;
        }
      }
      Object.values(nodes).forEach((n) => n.classList.remove("is-hot"));
      nodes[who].classList.add("is-on", "is-hot");
      items[i].classList.add("is-current", "is-done");
      await wait(i === steps.length - 1 ? 300 : 520);
    }
    if (id !== runId) return;
    Object.values(nodes).forEach((n) => n.classList.remove("is-hot"));
    packet.classList.remove("is-live");
    replayBtn.disabled = false;
  }

  const scenarioBtns = $$(".scenario");
  let current = "chat";
  function select(btn, focus) {
    scenarioBtns.forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    current = btn.dataset.scenario;
    play(current);
  }
  scenarioBtns.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener("click", () => select(b));
    b.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      select(scenarioBtns[(i + dir + scenarioBtns.length) % scenarioBtns.length], true);
    });
  });
  replayBtn.addEventListener("click", () => play(current));

  drawWires();
  new ResizeObserver(() => { drawWires(); fillBlueprint(); }).observe(map);
  document.fonts?.ready.then(drawWires);

  const seen = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { seen.disconnect(); play(current); }
  }, { threshold: 0.45 });
  seen.observe(map);

  // ---------- command palette ----------
  const cmdk = $("#cmdk");
  const input = $("#cmdk-input");
  const results = $("#cmdk-results");
  const openLink = (url) => window.open(url, "_blank", "noopener");
  const jump = (sel) => $(sel).scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  const COMMANDS = [
    { group: "Jump to", label: "The system map", hint: "#system", run: () => jump("#system") },
    { group: "Jump to", label: "Also shipped", hint: "#work", run: () => jump("#work") },
    { group: "Jump to", label: "IEEE paper", hint: "#paper", run: () => jump("#paper") },
    { group: "Jump to", label: "About and toolkit", hint: "#about", run: () => jump("#about") },
    { group: "Jump to", label: "Contact", hint: "#contact", run: () => jump("#contact") },
    { group: "Do", label: "Copy my email", hint: EMAIL, run: () => copyEmail() },
    { group: "Do", label: "Write me an email", hint: "mailto", run: () => (window.location.href = `mailto:${EMAIL}`) },
    { group: "Do", label: "Open GitHub", hint: "Abhinav-C-7", run: () => openLink("https://github.com/Abhinav-C-7") },
    { group: "Do", label: "Open LinkedIn", hint: "abhinav-c-dev", run: () => openLink("https://linkedin.com/in/abhinav-c-dev") },
    { group: "Do", label: "Open TrainLabs", hint: "trainlabs.app", run: () => openLink("https://trainlabs.app") },
    { group: "Do", label: "Download résumé", hint: "PDF", run: () => openLink("resume.pdf") },
    { group: "Do", label: "Trace a request: PDF import", hint: "map", run: () => { jump("#system"); select(scenarioBtns[1]); } },
  ];
  let filtered = COMMANDS, active = 0, lastFocus = null;

  function render() {
    const q = input.value.trim().toLowerCase();
    filtered = COMMANDS.filter((c) => `${c.label} ${c.hint} ${c.group}`.toLowerCase().includes(q));
    active = Math.min(active, Math.max(0, filtered.length - 1));
    results.replaceChildren();
    if (!filtered.length) {
      const p = document.createElement("p");
      p.className = "cmdk__empty";
      p.textContent = `Nothing for “${input.value}”. Try “email” or “map”.`;
      results.appendChild(p);
      return;
    }
    let group = "";
    filtered.forEach((c, i) => {
      if (c.group !== group) {
        group = c.group;
        const g = document.createElement("p");
        g.className = "cmdk__group";
        g.textContent = group;
        results.appendChild(g);
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cmdk__item" + (i === active ? " is-active" : "");
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(i === active));
      b.innerHTML = `<span></span><span class="cmdk__item-hint"></span>`;
      b.firstChild.textContent = c.label;
      b.lastChild.textContent = c.hint;
      b.addEventListener("click", () => run(i));
      b.addEventListener("mousemove", () => { if (active !== i) { active = i; render(); } });
      results.appendChild(b);
    });
    $(".cmdk__item.is-active", results)?.scrollIntoView({ block: "nearest" });
  }
  function open() {
    lastFocus = document.activeElement;
    cmdk.classList.add("is-open");
    cmdk.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    input.value = ""; active = 0; render();
    requestAnimationFrame(() => input.focus());
  }
  function close() {
    cmdk.classList.remove("is-open");
    cmdk.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    lastFocus?.focus?.();
  }
  function run(i) {
    const c = filtered[i];
    if (!c) return;
    close();
    c.run();
  }
  $("#searchpill").addEventListener("click", open);
  $$("[data-close]", cmdk).forEach((el) => el.addEventListener("click", close));
  input.addEventListener("input", () => { active = 0; render(); });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      cmdk.classList.contains("is-open") ? close() : open();
      return;
    }
    if (!cmdk.classList.contains("is-open")) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % Math.max(1, filtered.length); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + filtered.length) % Math.max(1, filtered.length); render(); }
    else if (e.key === "Enter") { e.preventDefault(); run(active); }
    else if (e.key === "Tab") {
      // keep focus inside the dialog
      e.preventDefault();
      input.focus();
    }
  });
})();

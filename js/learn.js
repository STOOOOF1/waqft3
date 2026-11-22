/* طبقة التعلّم: الدروس، والمحاكيات، والأسئلة، والمراجعة، والخريطة، والرتب، والشهادة، والحفظ.
   تعمل وحدها دون العالم ثلاثي الأبعاد، والعالم يستدعيها عبر window.LEARN. */
(function () {
  "use strict";
  const C = window.CONTENT;
  const KEY = "waqf-city-v1";
  const PASS = 0.7;
  const XP = { read: 10, quick: 15, quizQ: 5, pass: 40, widget: 20 };
  const RANK_AT = [0, 150, 400, 750, 1100, 1450];
  const $ = (s, r = document) => r.querySelector(s);
  const AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rich = s => esc(s).replace(/﴿[^﴾]*﴾/g, m => `<span class="ayah">${m}</span>`);
  const ref = n => `${C.meta.pageLabel}${AR(n)}`;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- فهارس ----------
  const lessons = [], lessonById = {}, unitOf = {};
  C.chapters.forEach((c, ci) => c.lessons.forEach(l => { l.unit = c.id; l.ci = ci; lessons.push(l); lessonById[l.id] = l; unitOf[l.id] = c; }));
  const unitById = {}; C.chapters.forEach((c, i) => { c.i = i; unitById[c.id] = c; });
  const allQ = [];
  lessons.forEach(l => allQ.push(Object.assign({ id: l.id + "q", kind: "quick", unit: l.unit }, l.quick)));
  C.chapters.forEach(c => c.quiz.forEach((q, i) => allQ.push(Object.assign({ id: c.id + "q" + i, kind: "quiz", unit: c.id }, q))));
  const qById = {}; allQ.forEach(q => qById[q.id] = q);

  // ---------- الحفظ ----------
  const blank = () => ({ read: {}, quick: {}, quiz: {}, widgets: {}, wrong: [], xp: 0, mute: false, low: null, name: "", seenStart: false });
  let S = blank(), canStore = true;
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) { canStore = false; }
  const save = () => { if (!canStore) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { canStore = false; } };
  const listeners = [];
  const changed = () => { save(); renderHud(); listeners.forEach(f => { try { f(); } catch (e) { console.warn(e); } }); };

  // ---------- الصوت ----------
  let actx = null;
  function tone(freqs, dur = 0.12, type = "sine", vol = 0.08) {
    if (S.mute) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime;
      freqs.forEach(f => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur); t += dur * 0.8;
      });
    } catch (e) { }
  }
  const sfx = { ok: () => tone([660, 880], .12), bad: () => tone([220, 165], .16, "triangle", .07), xp: () => tone([523, 659, 784, 1046], .09), open: () => tone([440], .06, "sine", .04), rank: () => tone([392, 523, 659, 784, 1046, 1318], .11) };

  // ---------- الخبرة والرتب ----------
  const rankIndex = xp => { let r = 0; RANK_AT.forEach((t, i) => { if (xp >= t) r = i; }); return r; };
  function addXP(n, why) {
    const before = rankIndex(S.xp); S.xp += n;
    const after = rankIndex(S.xp);
    toast(`+${AR(n)} خبرة${why ? " · " + why : ""}`);
    if (after > before) setTimeout(() => { toast(`🎉 رتبة جديدة: ${C.ranks[after]}`); sfx.rank(); }, 900); else sfx.xp();
  }
  let toastT;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2200); }

  const lessonState = id => S.quick[id] ? "mastered" : S.read[id] ? "read" : "new";
  const unitScore = uid => S.quiz[uid] == null ? null : S.quiz[uid];
  const unitPassed = uid => (S.quiz[uid] || 0) >= PASS;
  const allPassed = () => C.chapters.every(c => unitPassed(c.id));
  function addWrong(id) { if (!S.wrong.includes(id)) S.wrong.push(id); }
  function dropWrong(id) { S.wrong = S.wrong.filter(x => x !== id); }

  function renderHud() {
    const r = rankIndex(S.xp), lo = RANK_AT[r], hi = RANK_AT[r + 1];
    $("#rankSeal").textContent = AR(r + 1);
    $("#rankName").textContent = C.ranks[r];
    $("#xpFill").style.width = (hi ? Math.min(100, (S.xp - lo) / (hi - lo) * 100) : 100) + "%";
    $(".rankbox").title = `${AR(S.xp)} نقطة خبرة` + (hi ? ` — الرتبة التالية عند ${AR(hi)}` : "");
    $("#wrongN").textContent = S.wrong.length ? AR(S.wrong.length) : "";
    $("#bSound").textContent = S.mute ? "🔇" : "🔊";
    $("#objective").innerHTML = objective();
  }
  function objective() {
    if (allPassed()) return `<b>اكتملت المدينة!</b> افتح الخريطة لاستلام شهادتك، أو راجع أخطاءك.`;
    for (const c of C.chapters) {
      const l = c.lessons.find(x => lessonState(x.id) === "new");
      if (l) return `<b>الهدف:</b> أشعل فانوس «${esc(l.title)}» عند ${esc(c.emblem)}.`;
      if (!unitPassed(c.id)) return `<b>الهدف:</b> اجتز بوابة ${esc(c.emblem)}: اختبار «${esc(c.title)}».`;
    }
    return "";
  }

  // ---------- النافذة ----------
  const modal = $("#modal"), sheet = $("#sheet");
  let stack = [];
  function show(view, push = true) {
    if (push) stack.push(view); else stack[stack.length - 1] = view;
    sheet.innerHTML = "";
    view.render(sheet);
    modal.classList.add("open");
    const body = sheet.querySelector(".sh-body"); if (body) body.scrollTop = 0;
    sfx.open();
    if (W && W.pause) W.pause(true);
  }
  function close() { stack = []; modal.classList.remove("open"); sheet.innerHTML = ""; if (W && W.pause) W.pause(false); }
  function back() { stack.pop(); const v = stack[stack.length - 1]; if (v) show(v, false); else close(); }
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  const isOpen = () => modal.classList.contains("open");

  function frame(root, { crumb, title, qline, foot }) {
    const backBtn = stack.length > 1 ? `<button class="xbtn" data-back title="رجوع">→</button>` : "";
    root.innerHTML = `<div class="sh-head">${backBtn}<div style="min-width:0"><div class="crumb">${crumb || ""}</div><h2>${title}</h2>${qline ? `<div class="qline">${qline}</div>` : ""}</div>
      <button class="xbtn" data-close title="إغلاق (Esc)">✕</button></div><div class="sh-body"></div>${foot ? `<div class="sh-foot"></div>` : ""}`;
    root.querySelector("[data-close]").onclick = close;
    const b = root.querySelector("[data-back]"); if (b) b.onclick = back;
    return { body: root.querySelector(".sh-body"), foot: root.querySelector(".sh-foot") };
  }

  // ---------- سؤال واحد ----------
  function renderQuestion(host, q, opts = {}) {
    const order = shuffle(q.options.map((_, i) => i));
    const card = document.createElement("div"); card.className = "qcard";
    card.innerHTML = `<div class="qh">${opts.head || "سؤال"}</div><div class="qq">${rich(q.q)}</div><div class="opts"></div>`;
    const box = card.querySelector(".opts");
    order.forEach((oi, k) => {
      const b = document.createElement("button"); b.className = "opt";
      b.innerHTML = `<span class="l">${"أبجد"[k] || AR(k + 1)}</span><span>${rich(q.options[oi])}</span>`;
      b.onclick = () => {
        const right = oi === q.answer;
        box.querySelectorAll(".opt").forEach((x, kk) => { x.disabled = true; if (order[kk] === q.answer) x.classList.add("ok"); });
        if (!right) b.classList.add("bad");
        const fb = document.createElement("div"); fb.className = "fb " + (right ? "ok" : "bad");
        fb.innerHTML = `<b>${right ? "✔ إجابة صحيحة." : "✘ ليست هذه."}</b> ${rich(q.explain)} <button class="ref" data-l="l${q.page}">${ref(q.page)}: ${esc(lessonById["l" + q.page].title)}</button>`;
        fb.querySelector(".ref").onclick = () => openLesson("l" + q.page);
        card.appendChild(fb);
        right ? sfx.ok() : sfx.bad();
        opts.onAnswer && opts.onAnswer(right);
      };
      box.appendChild(b);
    });
    host.appendChild(card);
    return card;
  }

  // ---------- الدرس ----------
  function blockHTML(b) {
    if (b.type === "p") return `<p>${rich(b.text)}</p>`;
    if (b.type === "note") return `<p class="added">${rich(b.text)}</p>`;
    if (b.type === "rule") {
      const cls = b.label === "تعريف" ? "def" : b.label === "خلاصة" ? "sum" : "hukm";
      return `<div class="box ${cls}"><span class="tag">${esc(b.label)}</span><div>${rich(b.text)}</div></div>`;
    }
    if (b.type === "point") return `<div class="pt"><span class="ord">${esc(b.label)}</span><div>${b.head ? `<b>${rich(b.head)}.</b> ` : ""}${rich(b.text)}</div></div>`;
    if (b.type === "list") return `<ol class="lst">${b.items.map(it => `<li>${it.term ? `<b>${rich(it.term)}:</b> ` : ""}${rich(it.text)}</li>`).join("")}</ol>`;
    if (b.type === "table") return `<div class="tablewrap"><table class="cmp"><tr>${b.head.map(h => `<th>${rich(h)}</th>`).join("")}</tr>${b.rows.map(r => `<tr>${r.map(c => `<td>${rich(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
    return "";
  }
  function openLesson(id) {
    const l = lessonById[id]; if (!l) return;
    const c = unitOf[id];
    if (!S.read[id]) { S.read[id] = true; addXP(XP.read, "قراءة درس"); changed(); }
    show({ render(root) {
      const { body, foot } = frame(root, { crumb: `الوحدة ${AR(c.i + 1)}: ${esc(c.title)} · ${ref(l.n)}`, title: esc(l.title), qline: rich(l.question), foot: true });
      body.innerHTML = l.blocks.map(blockHTML).join("");
      if (l.widget) renderWidget(body, l.widget);
      renderQuestion(body, l.quick, { head: "سؤال الفانوس — أجب لتثبيت الدرس", onAnswer: right => {
        if (right) { dropWrong(id + "q"); if (!S.quick[id]) { S.quick[id] = true; addXP(XP.quick, "فانوس مضيء"); } }
        else addWrong(id + "q");
        changed();
      } });
      const i = lessons.indexOf(l), prev = lessons[i - 1], next = lessons[i + 1];
      foot.innerHTML = `<button class="btn alt" data-p ${prev ? "" : "disabled"}>→ السابق</button><button class="btn alt" data-n ${next ? "" : "disabled"}>التالي ←</button><span class="sp"></span>
        <button class="btn gold" data-q>اختبار الوحدة</button><button class="btn alt" data-m>الخريطة</button>${W && W.goTo ? `<button class="btn" data-go>اذهب إليه في المدينة</button>` : ""}`;
      foot.querySelector("[data-p]").onclick = () => prev && openLesson(prev.id);
      foot.querySelector("[data-n]").onclick = () => next && openLesson(next.id);
      foot.querySelector("[data-q]").onclick = () => openQuiz(c.id);
      foot.querySelector("[data-m]").onclick = openMap;
      const go = foot.querySelector("[data-go]"); if (go) go.onclick = () => { close(); W.goTo(id); };
    } });
  }

  // ---------- المحاكيات ----------
  function widgetDone(wid) { if (!S.widgets[wid]) { S.widgets[wid] = true; addXP(XP.widget, "محاكٍ مكتمل"); changed(); } }
  function renderWidget(host, wid) {
    const w = C.widgets[wid]; if (!w) return;
    const el = document.createElement("div"); el.className = "wg";
    el.innerHTML = `<h3>🧪 ${esc(w.title)} <span class="chip">جرّب</span> <button class="ref" data-l>${ref(w.page)}</button></h3><div class="hint">${esc(w.hint || "")}</div><div class="wb"></div>`;
    el.querySelector("[data-l]").onclick = () => openLesson("l" + w.page);
    host.appendChild(el);
    const wb = el.querySelector(".wb");
    ({ sort: wSort, compare: wCompare, stepper: wStepper, judge: wJudge })[w.type](wb, w, wid);
  }
  function wSort(wb, w, wid) {
    let r = 0;
    const draw = () => {
      const R = w.rounds[r];
      wb.innerHTML = `${w.rounds.length > 1 ? `<div class="trail">الجولة ${AR(r + 1)} من ${AR(w.rounds.length)}: <b>${esc(R.title)}</b></div>` : `<div class="trail"><b>${esc(R.title)}</b></div>`}
        <div class="pool"></div><div class="bins"></div><div class="wmsg"></div>`;
      const pool = wb.querySelector(".pool"), bins = wb.querySelector(".bins"), msg = wb.querySelector(".wmsg");
      let sel = null, left = R.cards.length;
      const binEls = R.bins.map((t, bi) => {
        const b = document.createElement("button"); b.className = "bin"; b.innerHTML = `<div class="bt">${esc(t)}</div>`;
        b.onclick = () => {
          if (!sel) { msg.className = "wmsg"; msg.textContent = "اختر بطاقة أولًا، ثم اضغط على الكفة المناسبة."; return; }
          const cd = sel.__card;
          if (cd.bin === bi) {
            sel.classList.remove("sel"); sel.classList.add("placed"); sel.disabled = true; b.appendChild(sel); sel = null; left--;
            binEls.forEach(x => x.classList.remove("ready")); sfx.ok(); msg.className = "wmsg ok"; msg.textContent = "أحسنت!";
            if (!left) {
              if (r < w.rounds.length - 1) { msg.textContent = "اكتملت الجولة — التالية…"; setTimeout(() => { r++; draw(); }, 900); }
              else { msg.innerHTML = "✔ اكتمل التصنيف كله. <button class='ref' data-re>أعد للأصل</button>"; msg.querySelector("[data-re]").onclick = () => { r = 0; draw(); }; widgetDone(wid); }
            }
          } else { sel.classList.add("shake"); setTimeout(() => sel && sel.classList.remove("shake"), 400); sfx.bad(); msg.className = "wmsg bad"; msg.textContent = `ليست في «${R.bins[bi]}» — راجع النص وحاول مرة أخرى.`; }
        };
        bins.appendChild(b); return b;
      });
      shuffle(R.cards).forEach(cd => {
        const c = document.createElement("button"); c.className = "chipcard"; c.innerHTML = rich(cd.text); c.__card = cd;
        c.onclick = () => { if (c.disabled) return; if (sel) sel.classList.remove("sel"); sel = c; c.classList.add("sel"); binEls.forEach(x => x.classList.add("ready")); msg.className = "wmsg"; msg.textContent = ""; };
        pool.appendChild(c);
      });
    };
    draw();
  }
  function wCompare(wb, w, wid) {
    let on = w.cols.map((_, i) => i < 2);
    const draw = () => {
      const idx = w.cols.map((_, i) => i).filter(i => on[i]);
      wb.innerHTML = `<div class="colpick">${w.cols.map((c, i) => `<button class="${on[i] ? "on" : ""}" data-i="${i}">${esc(c)}</button>`).join("")}</div>
        <div class="tablewrap"><table class="cmp"><tr><th></th>${idx.map(i => `<th>${esc(w.cols[i])}</th>`).join("")}</tr>
        ${w.rows.map(r => `<tr><td class="rl">${esc(r.label)}</td>${idx.map(i => r.vals[i] ? `<td>${rich(r.vals[i])}</td>` : `<td class="na">لم يذكره المقرر</td>`).join("")}</tr>`).join("")}</table></div>`;
      wb.querySelectorAll(".colpick button").forEach(b => b.onclick = () => {
        const i = +b.dataset.i; on[i] = !on[i]; if (!on.some(Boolean)) on[i] = true; draw(); sfx.open();
        if (on.filter(Boolean).length === w.cols.length) widgetDone(wid);
      });
    };
    draw();
    if (w.cols.length <= 2) widgetDone(wid);
  }
  function wStepper(wb, w, wid) {
    const go = (id, trail) => {
      const n = w.nodes[id];
      if (n.result) {
        wb.innerHTML = `<div class="trail">${trail.map(esc).join(" ← ")}</div><div class="step result"><b>الحكم:</b> ${rich(n.result)}</div><div class="yn" style="margin-top:10px"><button class="btn alt" data-r>جرّب مسارًا آخر</button></div>`;
        wb.querySelector("[data-r]").onclick = () => go(w.start, []);
        sfx.ok(); widgetDone(wid); return;
      }
      wb.innerHTML = `${trail.length ? `<div class="trail">${trail.map(esc).join(" ← ")}</div>` : ""}<div class="step">${rich(n.q)}<div class="yn"><button class="btn" data-y>نعم</button><button class="btn alt" data-n>لا</button></div></div>`;
      wb.querySelector("[data-y]").onclick = () => go(n.yes, trail.concat("نعم"));
      wb.querySelector("[data-n]").onclick = () => go(n.no, trail.concat("لا"));
    };
    go(w.start, []);
  }
  function wJudge(wb, w, wid) {
    let left = w.items.length;
    wb.innerHTML = `<div class="judge"></div><div class="wmsg"></div>`;
    const list = wb.querySelector(".judge");
    shuffle(w.items).forEach(it => {
      const row = document.createElement("div"); row.className = "jrow";
      row.innerHTML = `<div class="jt">${rich(it.text)}</div><div class="jb"><button data-v="1">✔ يوافق الأسس</button><button data-v="0">✘ يخالفها</button></div>`;
      row.querySelectorAll("button").forEach(b => b.onclick = () => {
        const right = (b.dataset.v === "1") === it.ok;
        row.className = "jrow " + (right ? "done-ok" : "done-bad");
        row.querySelector(".jb").innerHTML = `<b>${right ? "✔ حكم صحيح" : "✘ حكم غير دقيق"}</b> — ${it.ok ? "القرار يوافق الأسس" : "القرار يخالف الأسس"}`;
        const why = document.createElement("div"); why.className = "why"; why.innerHTML = `${rich(it.why)} <button class="ref">${ref(it.page)}</button>`;
        why.querySelector(".ref").onclick = () => openLesson("l" + it.page);
        row.appendChild(why); right ? sfx.ok() : sfx.bad();
        if (--left === 0) { const m = wb.querySelector(".wmsg"); m.className = "wmsg ok"; m.textContent = "✔ راجعت كل القرارات."; widgetDone(wid); }
      });
      list.appendChild(row);
    });
  }

  // ---------- جلسة أسئلة (اختبار وحدة / مراجعة / أخطاء) ----------
  function runSession({ title, crumb, qs, onDone }) {
    let i = 0, right = 0; const marks = [];
    const view = { render(root) {
      const { body, foot } = frame(root, { crumb, title, foot: true });
      const q = qs[i];
      body.innerHTML = `<div class="progressdots">${qs.map((_, k) => `<i class="${marks[k] === true ? "ok" : marks[k] === false ? "bad" : k === i ? "cur" : ""}"></i>`).join("")}</div>`;
      foot.innerHTML = `<span class="score">السؤال ${AR(i + 1)} من ${AR(qs.length)}</span><span class="sp"></span><button class="btn" data-next disabled>${i < qs.length - 1 ? "التالي ←" : "النتيجة"}</button>`;
      const next = foot.querySelector("[data-next]");
      renderQuestion(body, q, { head: `الوحدة ${AR(unitById[q.unit].i + 1)} · ${esc(unitById[q.unit].title)}`, onAnswer: ok => {
        marks[i] = ok; if (ok) { right++; dropWrong(q.id); } else addWrong(q.id);
        changed(); next.disabled = false; body.querySelectorAll(".progressdots i")[i].className = ok ? "ok" : "bad";
      } });
      next.onclick = () => { if (i < qs.length - 1) { i++; show(view, false); } else onDone(right, qs, marks); };
    } };
    show(view);
  }
  function resultView({ title, crumb, right, qs, marks, passLine, extra }) {
    const pct = right / qs.length;
    show({ render(root) {
      const { body, foot } = frame(root, { crumb, title, foot: true });
      const wrongs = qs.filter((_, k) => marks[k] === false);
      body.innerHTML = `<div class="topstats"><div class="stat"><b>${AR(right)} من ${AR(qs.length)}</b><span>إجابات صحيحة</span></div>
        <div class="stat"><b>${AR(Math.round(pct * 100))}٪</b><span>${passLine ? (pct >= PASS ? "✔ اجتزت (٧٠٪ فأكثر)" : "لم تبلغ ٧٠٪ بعد") : "نسبة الصواب"}</span></div></div>
        ${extra || ""}
        ${wrongs.length ? `<h3 style="font-family:var(--f-ui)">راجع هذه:</h3>${wrongs.map(q => `<div class="lrow" style="margin-bottom:6px"><span class="nn">${ref(q.page)}</span><span style="flex:1">${rich(q.q)}</span><button class="ref" data-l="${q.page}">افتح الدرس</button></div>`).join("")}` : `<p>🎉 لا أخطاء في هذه الجولة.</p>`}`;
      body.querySelectorAll("[data-l]").forEach(b => b.onclick = () => openLesson("l" + b.dataset.l));
      foot.innerHTML = `<button class="btn alt" data-m>الخريطة</button><span class="sp"></span>${S.wrong.length ? `<button class="btn alt" data-w>دفتر أخطائي (${AR(S.wrong.length)})</button>` : ""}<button class="btn" data-r>جولة جديدة</button>`;
      foot.querySelector("[data-m]").onclick = openMap;
      const w = foot.querySelector("[data-w]"); if (w) w.onclick = () => openReview("wrong");
      foot.querySelector("[data-r]").onclick = () => passLine ? openQuiz(passLine) : openReview("mix");
    } });
  }
  function openQuiz(uid) {
    const c = unitById[uid];
    const qs = shuffle(c.quiz.map((q, i) => qById[uid + "q" + i]));
    runSession({ title: `بوابة ${esc(c.emblem)}`, crumb: `اختبار الوحدة ${AR(c.i + 1)}: ${esc(c.title)} · النجاح ٧٠٪`, qs, onDone: (right, qs2, marks) => {
      const pct = right / qs2.length, prev = S.quiz[uid] || 0;
      if (pct > prev) {
        const gain = Math.max(0, Math.round((pct - prev) * qs2.length)) * XP.quizQ;
        S.quiz[uid] = pct;
        if (gain) addXP(gain, "اختبار");
        if (pct >= PASS && prev < PASS) setTimeout(() => { addXP(XP.pass, `فتحت بوابة ${c.emblem}`); changed(); if (allPassed()) setTimeout(() => toast("🏅 الشهادة جاهزة في الخريطة"), 1400); }, 700);
        changed();
      }
      resultView({ title: pct >= PASS ? `فُتحت بوابة ${esc(c.emblem)}` : `بوابة ${esc(c.emblem)} ما زالت مغلقة`, crumb: `نتيجة اختبار الوحدة ${AR(c.i + 1)}`, right, qs: qs2, marks, passLine: uid });
    } });
  }
  function openReview(mode, units) {
    let pool, title;
    if (mode === "wrong") {
      pool = S.wrong.map(id => qById[id]).filter(Boolean);
      title = "دفتر أخطائي";
      if (!pool.length) { show({ render(root) { const { body } = frame(root, { crumb: "المراجعة", title }); body.innerHTML = `<p>لا أخطاء محفوظة 👏 — كل سؤال تخطئ فيه يُضاف هنا تلقائيًا، ويخرج حين تجيبه صحيحًا.</p><button class="btn" data-r>مراجعة سريعة</button>`; body.querySelector("[data-r]").onclick = () => openReview("mix"); } }); return; }
    } else {
      const set = units && units.length ? allQ.filter(q => units.includes(q.unit)) : allQ;
      pool = shuffle(set).slice(0, 10); title = "مراجعة سريعة";
    }
    pool = shuffle(pool).slice(0, 15);
    runSession({ title, crumb: mode === "wrong" ? "الأسئلة التي أخطأت فيها" : "١٠ أسئلة عشوائية من المقرر كله", qs: pool, onDone: (right, qs, marks) =>
      resultView({ title: "نتيجة المراجعة", crumb: title, right, qs, marks }) });
  }
  function reviewPicker() {
    show({ render(root) {
      const { body, foot } = frame(root, { crumb: "قبل الاختبار", title: "مراجعة سريعة", foot: true });
      body.innerHTML = `<p>اختر الوحدات التي تريد مراجعتها (أو اتركها كلها)، وستأتيك ١٠ أسئلة عشوائية مع الشرح ورقم السؤال في المقرر.</p>
        <div class="colpick">${C.chapters.map(c => `<button class="on" data-u="${c.id}">${AR(c.i + 1)}. ${esc(c.title)}</button>`).join("")}</div>`;
      body.querySelectorAll("[data-u]").forEach(b => b.onclick = () => b.classList.toggle("on"));
      foot.innerHTML = `${S.wrong.length ? `<button class="btn alt" data-w>دفتر أخطائي (${AR(S.wrong.length)})</button>` : ""}<span class="sp"></span><button class="btn" data-go>ابدأ ⚡</button>`;
      const w = foot.querySelector("[data-w]"); if (w) w.onclick = () => openReview("wrong");
      foot.querySelector("[data-go]").onclick = () => { const u = [...body.querySelectorAll("[data-u].on")].map(b => b.dataset.u); openReview("mix", u); };
    } });
  }

  // ---------- الخريطة ----------
  function openMap() {
    show({ render(root) {
      const { body, foot } = frame(root, { crumb: esc(C.meta.source), title: "خريطة المنهج", foot: true });
      const read = lessons.filter(l => S.read[l.id]).length, mast = lessons.filter(l => S.quick[l.id]).length, passed = C.chapters.filter(c => unitPassed(c.id)).length;
      body.innerHTML = `<div class="topstats">
        <div class="stat"><b>${AR(read)} من ${AR(lessons.length)}</b><span>دروس مقروءة</span></div>
        <div class="stat"><b>${AR(mast)} من ${AR(lessons.length)}</b><span>فوانيس مثبّتة</span></div>
        <div class="stat"><b>${AR(passed)} من ${AR(C.chapters.length)}</b><span>بوابات مفتوحة</span></div>
        <div class="stat"><b>${AR(S.xp)}</b><span>خبرة · ${esc(C.ranks[rankIndex(S.xp)])}</span></div></div>
        <div class="mapgrid">${C.chapters.map(c => {
          const sc = unitScore(c.id);
          return `<div class="ucard"><div class="uh"><span class="un">${AR(c.i + 1)}</span><div><div class="ut">${esc(c.title)}</div><div class="ue">المعلم: ${esc(c.emblem)}</div></div></div>
          ${c.lessons.map(l => { const st = lessonState(l.id); return `<button class="lrow" data-l="${l.id}"><span class="st ${st === "mastered" ? "mast" : st === "read" ? "read" : ""}">${st === "mastered" ? "✔" : ""}</span><span class="nn">${ref(l.n)}</span><span>${esc(l.title)}</span></button>`; }).join("")}
          <div class="ufoot"><button class="btn gold" data-q="${c.id}">اختبار الوحدة</button>${sc != null ? `<span class="score ${sc >= PASS ? "pass" : ""}">أفضل نتيجة ${AR(Math.round(sc * 100))}٪</span>` : ""}${W && W.goTo ? `<button class="btn alt" data-g="${c.id}">اذهب للمعلم</button>` : ""}</div></div>`;
        }).join("")}</div>`;
      body.querySelectorAll("[data-l]").forEach(b => b.onclick = () => openLesson(b.dataset.l));
      body.querySelectorAll("[data-q]").forEach(b => b.onclick = () => openQuiz(b.dataset.q));
      body.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { close(); W.goTo(b.dataset.g); });
      foot.innerHTML = `<button class="btn alt" data-i>مدخل المقرر</button><button class="btn alt" data-s>الخلاصة</button><span class="sp"></span>
        <button class="btn alt" data-r>مراجعة سريعة</button><button class="btn ${allPassed() ? "gold" : "alt"}" data-c>🏅 الشهادة${allPassed() ? "" : " (مقفلة)"}</button>`;
      foot.querySelector("[data-i]").onclick = openIntro;
      foot.querySelector("[data-s]").onclick = openSummary;
      foot.querySelector("[data-r]").onclick = reviewPicker;
      foot.querySelector("[data-c]").onclick = openCert;
    } });
  }
  function openIntro() {
    show({ render(root) {
      const { body } = frame(root, { crumb: C.meta.level, title: "مدخل إلى مقرر " + esc(C.meta.title) });
      body.innerHTML = C.meta.intro.map(p => `<p>${rich(p)}</p>`).join("");
    } });
  }
  function openSummary() {
    show({ render(root) {
      const { body, foot } = frame(root, { crumb: "بطاقات الخلاصة", title: "أهم ما في المقرر", foot: true });
      body.innerHTML = C.summary.map((s, i) => `<div class="box ${i % 2 ? "hukm" : "def"}"><span class="tag">${AR(i + 1)}</span> <button class="ref" data-l="${s.page}">${ref(s.page)}</button><div>${rich(s.text)}</div></div>`).join("");
      body.querySelectorAll("[data-l]").forEach(b => b.onclick = () => openLesson("l" + b.dataset.l));
      foot.innerHTML = `<span class="sp"></span><button class="btn" data-r>اختبر نفسك الآن ⚡</button>`;
      foot.querySelector("[data-r]").onclick = reviewPicker;
    } });
  }
  function openCert() {
    show({ render(root) {
      const { body } = frame(root, { crumb: "الشهادة", title: "شهادة إتمام مدينة الوقف" });
      if (!allPassed()) {
        body.innerHTML = `<p>تُمنح الشهادة بعد فتح البوابات السبع (٧٠٪ فأكثر في اختبار كل وحدة).</p>` +
          C.chapters.map(c => `<div class="lrow"><span class="st ${unitPassed(c.id) ? "mast" : ""}">${unitPassed(c.id) ? "✔" : ""}</span><span style="flex:1">${esc(c.emblem)} — ${esc(c.title)}</span><button class="ref" data-q="${c.id}">الاختبار</button></div>`).join("");
        body.querySelectorAll("[data-q]").forEach(b => b.onclick = () => openQuiz(b.dataset.q));
        return;
      }
      const avg = C.chapters.reduce((a, c) => a + (S.quiz[c.id] || 0), 0) / C.chapters.length;
      const d = new Date().toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { year: "numeric", month: "long", day: "numeric" });
      body.innerHTML = `<div class="cert"><div style="font-size:42px">🏅</div><div>تشهد مدينة الوقف أن</div>
        <div class="nm" id="certName">${esc(S.name || "…")}</div><div class="noprint"><input id="nameIn" placeholder="اكتب اسمك هنا" value="${esc(S.name)}"></div>
        <h3>${esc(C.ranks[rankIndex(S.xp)])}</h3>
        <p>أتمّ مراجعة مقرر «${esc(C.meta.title)}» — ${esc(C.meta.level)} — بوحداته السبع ودروسه الثلاثين،<br>بمتوسط ${AR(Math.round(avg * 100))}٪ في اختبارات الوحدات، و${AR(S.xp)} نقطة خبرة.</p>
        <p style="font-size:var(--t-sm);color:var(--ink-2)">${d}</p>
        <div class="noprint"><button class="btn gold" id="pr">🖨️ طباعة / حفظ PDF</button></div></div>`;
      const inp = body.querySelector("#nameIn");
      inp.oninput = () => { S.name = inp.value.slice(0, 60); body.querySelector("#certName").textContent = S.name || "…"; save(); };
      body.querySelector("#pr").onclick = () => window.print();
    } });
  }

  // ---------- التلميح ----------
  let promptAct = null;
  function setPrompt(p) {
    const el = $("#prompt");
    if (!p || isOpen()) { el.style.display = "none"; promptAct = null; return; }
    $("#promptText").textContent = p.text; $("#promptBtn").textContent = p.btn || "افتح";
    promptAct = p.act; el.style.display = "flex";
  }
  $("#promptBtn").onclick = () => promptAct && promptAct();

  // ---------- الأزرار ولوحة المفاتيح ----------
  $("#bMap").onclick = openMap;
  $("#bReview").onclick = reviewPicker;
  $("#bWrong").onclick = () => openReview("wrong");
  $("#bSum").onclick = openSummary;
  $("#bSound").onclick = () => { S.mute = !S.mute; changed(); };
  $("#bPerf").onclick = () => { S.low = !(W && W.isLow ? W.isLow() : S.low); changed(); W && W.setLow && W.setLow(S.low); toast(S.low ? "وضع الأداء المنخفض" : "جودة كاملة"); };
  document.addEventListener("keydown", e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "Escape") { if (isOpen()) close(); return; }
    if ($("#start").style.display !== "none") return;
    if (isOpen()) return;
    const k = e.code;
    if (k === "KeyM") { e.preventDefault(); openMap(); }
    else if (k === "KeyR") { e.preventDefault(); reviewPicker(); }
    else if ((k === "KeyE" || k === "Enter" || k === "NumpadEnter") && promptAct) { e.preventDefault(); promptAct(); }
  });

  // ---------- البدء ----------
  let W = null, startResolved = false;
  const touch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (touch) { document.body.classList.add("touch"); $("#ctrlText").textContent = "👆 العصا للمشي · اسحب الشاشة للتدوير · زر «افتح» عند الفانوس"; }
  function hideStart() { $("#start").style.display = "none"; S.seenStart = true; save(); if (actx && actx.state === "suspended") actx.resume(); }
  $("#bStart").onclick = () => { hideStart(); if (!W) openMap(); };
  $("#bStartMap").onclick = () => { hideStart(); openMap(); };
  $("#bStartReview").onclick = () => { hideStart(); reviewPicker(); };
  renderHud();

  window.LEARN = {
    C, S: () => S, lessons, lessonById, unitById, lessonState, unitPassed, allPassed,
    openLesson, openQuiz, openMap, openReview, reviewPicker, openSummary, openCert, openIntro,
    isOpen, close, setPrompt, toast, sfx, onChange: f => listeners.push(f), ar: AR, ref,
    prefLow: () => S.low, touch,
    worldReady(api) { W = api; startResolved = true; $("#startNote").textContent = canStore ? "يُحفظ تقدّمك تلقائيًا على هذا الجهاز." : "تنبيه: المتصفح يمنع الحفظ، فلن يبقى تقدّمك بعد الإغلاق."; renderHud(); },
    worldFailed(msg) {
      if (startResolved) return; startResolved = true;
      document.body.classList.add("flat");
      $("#world").style.display = "none";
      $("#bStart").textContent = "افتح خريطة المنهج";
      $("#startNote").innerHTML = `تعذّر تشغيل الرسوم ثلاثية الأبعاد على هذا الجهاز، فاللعبة تعمل بخريطة المنهج — كل الدروس والاختبارات متاحة.<br><small style="opacity:.6" dir="ltr">${esc(String(msg || "").slice(0, 160))}</small>`;
      console.warn("world failed:", msg);
    },
  };
})();

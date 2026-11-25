// تحقق من content.js: سلامة البنية + أمانة النقل (كل فقرة في المقرر موجودة في المحتوى)
const fs = require("fs");
global.window = {}; require(process.argv[2]); const C = window.CONTENT;
const src = fs.readFileSync(process.argv[3], "utf8").split(/\n\n+/).map(s => s.trim()).filter(Boolean);
const err = []; const ids = new Set();
const chk = (q, where) => {
  if (!q || !Array.isArray(q.options) || q.options.length < 2) err.push(where + ": options");
  else if (!(q.answer >= 0 && q.answer < q.options.length)) err.push(where + ": answer out of range");
  if (!q.page) err.push(where + ": no page");
  if (!q.explain) err.push(where + ": no explain");
  if (new Set(q.options).size !== q.options.length) err.push(where + ": duplicate options");
};
let text = (C.meta.intro || []).join("\n");
C.chapters.forEach(c => {
  if (ids.has(c.id)) err.push("dup " + c.id); ids.add(c.id);
  if (c.quiz.length < 5 || c.quiz.length > 9) err.push(c.id + ": quiz count " + c.quiz.length);
  c.quiz.forEach((q, i) => chk(q, c.id + " quiz " + i));
  c.lessons.forEach(l => {
    if (ids.has(l.id)) err.push("dup " + l.id); ids.add(l.id);
    chk(l.quick, l.id + " quick");
    if (l.widget && !C.widgets[l.widget]) err.push(l.id + ": missing widget " + l.widget);
    text += "\n" + l.question;
    l.blocks.forEach(b => {
      if (b.type === "list") b.items.forEach(it => text += "\n" + it.term + ": " + it.text);
      else text += "\n" + (b.label && b.type === "point" ? b.label + ": " : "") + (b.head ? b.head + ". " : "") + b.text;
    });
  });
});
Object.entries(C.widgets).forEach(([k, w]) => {
  if (!w.page) err.push(k + ": no page");
  if (w.type === "sort") w.rounds.forEach(r => r.cards.forEach(cd => { if (!(cd.bin >= 0 && cd.bin < r.bins.length)) err.push(k + ": bad bin"); }));
  if (w.type === "compare") w.rows.forEach(r => { if (r.vals.length !== w.cols.length) err.push(k + ": row len"); });
  if (w.type === "stepper") Object.values(w.nodes).forEach(n => ["yes", "no"].forEach(x => { if (n[x] && !w.nodes[n[x]]) err.push(k + ": bad node"); }));
});
C.summary.forEach((s, i) => { if (!s.page) err.push("summary " + i + " no page"); });
// أمانة النقل
const norm = s => s.replace(/\s+/g, " ").replace(/^\d+\.\s+/, "").replace(/^السؤال [^:]+:\s*/, "").trim();
const T = norm(text);
let missing = 0;
src.slice(4).forEach(p => { if (!T.includes(norm(p))) { missing++; err.push("MISSING: " + p.slice(0, 70)); } });
const nq = C.chapters.reduce((a, c) => a + c.quiz.length + c.lessons.length, 0);
console.log(`دروس ${C.chapters.reduce((a,c)=>a+c.lessons.length,0)} | أسئلة ${nq} | محاكيات ${Object.keys(C.widgets).length} | فقرات المقرر ${src.length - 4} مفقودة ${missing}`);
if (err.length) { console.log(err.join("\n")); process.exit(1); } else console.log("OK");

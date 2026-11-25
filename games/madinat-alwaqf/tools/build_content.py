# -*- coding: utf-8 -*-
"""يبني js/content.js من نص المقرر (mat.txt) ومن extras.py."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from extras import UNITS, SHORT, OVERRIDES, QUICK, QUIZ, WIDGETS, SUMMARY, RANKS

src, out = sys.argv[1], sys.argv[2]
paras = [p.strip() for p in open(src, encoding="utf-8").read().split("\n\n") if p.strip()]

ORD = r"^(أولًا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا|سابعًا):\s*"
CLOSERS = ("وبذلك", "وتبرز", "وتتحقق", "وتتحدد", "ويُسهم", "وتسهم هذه", "وتساعد دراسة")

intro, lessons, cur = [], [], None
for p in paras:
    if p.startswith("السؤال "):
        cur = {"q": p, "paras": []}
        lessons.append(cur)
    elif cur is None:
        intro.append(p)
    else:
        cur["paras"].append(p)
assert len(lessons) == 30, len(lessons)
intro = intro[4:]  # تخطي: مقرر / العنوان / المرحلة / عنوان المدخل
title_lines = [x for x in paras[:4]]


def blocks_for(n, ps):
    out, lst = [], None
    for i, p in enumerate(ps):
        m_list = re.match(r"^\d+\.\s+(.*)$", p, re.S)
        if m_list:
            body = m_list.group(1).strip()
            term, _, rest = body.partition(":")
            item = {"term": term.strip(), "text": rest.strip()} if rest else {"term": "", "text": body}
            if lst is None:
                lst = {"type": "list", "items": []}
                out.append(lst)
            lst["items"].append(item)
            continue
        lst = None
        label = OVERRIDES.get((n, i))
        m = re.match(ORD, p)
        if label:
            out.append({"type": "rule", "label": label, "text": p})
        elif m:
            rest = p[m.end():]
            head, sep, body = rest.partition(". ")
            if sep and len(head) <= 60:
                out.append({"type": "point", "label": m.group(1), "head": head, "text": body})
            else:
                out.append({"type": "point", "label": m.group(1), "head": "", "text": rest})
        elif i == 0 and re.search(r"(هو |هي |يقصد|يُقصد)", p[:120]):
            out.append({"type": "rule", "label": "تعريف", "text": p})
        elif i == len(ps) - 1 and p.startswith(CLOSERS):
            out.append({"type": "rule", "label": "خلاصة", "text": p})
        else:
            out.append({"type": "p", "text": p})
    return out


lesson_by_n = {}
for n, L in enumerate(lessons, 1):
    qtext = re.sub(r"^السؤال [^:]+:\s*", "", L["q"])
    lesson = {"id": f"l{n}", "n": n, "title": SHORT[n], "question": qtext, "page": n,
              "blocks": blocks_for(n, L["paras"]), "quick": QUICK[n]}
    for wid, w in WIDGETS.items():
        if w["lesson"] == n:
            lesson["widget"] = wid
    lesson_by_n[n] = lesson

chapters = []
for u in UNITS:
    chapters.append({"id": u["id"], "title": u["title"], "emblem": u["emblem"],
                     "lessons": [lesson_by_n[n] for n in u["lessons"]], "quiz": QUIZ[u["id"]]})

widgets = {k: {kk: vv for kk, vv in v.items() if kk != "lesson"} for k, v in WIDGETS.items()}

content = {
    "meta": {"title": "اقتصاديات الوقف والعمل الخيري", "subject": "الاقتصاد الإسلامي", "audience": "جامعي",
             "level": "مرحلة الماجستير", "source": "مذكرة مقرر اقتصاديات الوقف والعمل الخيري (٣٠ سؤالًا وجوابًا)",
             "pageLabel": "س", "style": "city3d", "mood": "غروب ذهبي", "use": "مراجعة قبل الاختبار",
             "fingerprint": {"classification": 0.35, "decision": 0.30, "rules": 0.20, "memorization": 0.15,
                             "procedural": 0.0, "spatial": 0.0, "narrative": 0.0},
             "intro": intro},
    "ranks": RANKS,
    "chapters": chapters,
    "widgets": widgets,
    "summary": SUMMARY,
}
with open(out, "w", encoding="utf-8") as f:
    f.write("// مولّد آليًا من نص المقرر — لا تعدّله يدويًا؛ عدّل tools/extras.py ثم أعد البناء.\n")
    f.write("window.CONTENT = ")
    json.dump(content, f, ensure_ascii=False, indent=1)
    f.write(";\n")
print("lessons", sum(len(c["lessons"]) for c in chapters), "quiz", sum(len(c["quiz"]) for c in chapters),
      "widgets", len(widgets), "intro paras", len(intro))

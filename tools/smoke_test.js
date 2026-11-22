const { chromium } = require("playwright");
(async () => {
  const url = process.argv[2], out = process.argv[3];
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const errs = [];
  for (const [name, vp, touch] of [["desk", { width: 1366, height: 820 }, false], ["mob", { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", e => errs.push(name + " pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errs.push(name + " " + m.type() + ": " + m.text()); });
    await page.goto(url); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${name}-0-start.png` });
    await page.click("#bStart"); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${name}-1-map.png` });
    await page.click("[data-l='l3']"); await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}-2-lesson.png` });
    // تمرير إلى المحاكي
    await page.evaluate(() => document.querySelector(".wg").scrollIntoView());
    // حل جولة تصنيف أولى: جرّب كل بطاقة في كل كفة
    for (let t = 0; t < 30; t++) {
      const left = await page.$$(".pool .chipcard:not(.placed)"); if (!left.length) break;
      await left[0].click(); const bins = await page.$$(".bin");
      for (const b of bins) { await b.click(); if (!(await page.$(".chipcard.sel"))) break; }
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}-3-widget.png` });
    await page.evaluate(() => document.querySelector(".qcard").scrollIntoView());
    await (await page.$$(".qcard .opt"))[1].click(); await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${name}-4-quick.png` });
    await page.click("[data-q]"); await page.waitForTimeout(300);
    for (let i = 0; i < 9; i++) { const o = await page.$$(".opt:not(:disabled)"); if (!o.length) break; await o[0].click(); await page.waitForTimeout(150); const n = await page.$("[data-next]"); if (!n) break; await n.click(); await page.waitForTimeout(150); }
    await page.screenshot({ path: `${out}/${name}-5-result.png` });
    await page.reload(); await page.waitForTimeout(1500);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem("waqf-city-v1") || "{}"));
    errs.push(`${name} saved: read=${Object.keys(st.read || {}).length} xp=${st.xp} quiz=${JSON.stringify(st.quiz)} wrong=${(st.wrong || []).length} flat=${await page.evaluate(() => document.body.classList.contains("flat"))}`);
    await ctx.close();
  }
  await browser.close(); console.log(errs.join("\n"));
})();

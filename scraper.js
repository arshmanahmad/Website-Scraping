// Scrapes 1688 offer page and prints JSON only
// Usage: node scraper.js https://detail.1688.com/offer/951728697627.html

import { chromium } from '@playwright/test';

// Random int helper
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Human-like short pause
const humanPause = async (page, min = 200, max = 800) => {
  await page.waitForTimeout(ri(min, max));
};

// Human-like mouse path
const humanMouseMove = async (page, from, to, steps = 30) => {
  const [x1, y1] = from;
  const [x2, y2] = to;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t + Math.sin(t * Math.PI) * ri(-2, 2);
    const y = y1 + (y2 - y1) * t + Math.cos(t * Math.PI) * ri(-2, 2);
    await page.mouse.move(x, y, { steps: 1 });
    await page.waitForTimeout(ri(5, 20));
  }
};

// Gentle scroll to trigger lazy content
const humanScroll = async (page) => {
  const height = await page.evaluate(() => document.body.scrollHeight);
  let y = 0;
  while (y < height) {
    y += ri(250, 600);
    await page.mouse.wheel(0, ri(150, 400));
    await humanPause(page, 150, 350);
  }
};

// Try to solve Ali-style slider if shown (best-effort heuristic)
const trySolveSlider = async (page) => {
  try {
    const sliderHandle = await page
      .locator('div[role="slider"], .nc_iconfont.btn_slide, .slider, .geetest_slider_button')
      .first();
    if (await sliderHandle.count()) {
      const box = await sliderHandle.boundingBox();
      if (!box) return false;

      await humanPause(page, 400, 900);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await humanPause(page, 200, 400);
      await page.mouse.down();

      const dragDistance = ri(280, 360);
      const steps = ri(25, 40);
      for (let i = 0; i < steps; i++) {
        await page.mouse.move(
          box.x + box.width / 2 + (dragDistance * (i + 1)) / steps + ri(-2, 2),
          box.y + box.height / 2 + ri(-1, 1),
          { steps: 1 }
        );
        await page.waitForTimeout(ri(8, 28));
      }
      await humanPause(page, 100, 250);
      await page.mouse.up();
      await humanPause(page, 1200, 2000);

      return await page.evaluate(() => !!document.querySelector('#content'));
    }
  } catch {}
  return false;
};

// Extract using window.context if available, fallback to DOM
const extractData = async (page) => {
  const data = await page.evaluate(() => {
    const safe = (p, d) => {
      try { return p(); } catch { return d; }
    };

    const ctx = safe(() => window.context, null);
    if (ctx) {
      const root = safe(() => ctx.result?.data, {});
      const global = safe(() => ctx.result?.global?.globalData?.model, {});
      const detail = safe(() => global?.offerDetail || {});
      const trade = safe(() => global?.tradeModel || {});
      const priceModel = safe(() => global?.tradeModel?.offerPriceModel || {});
      const gallery = safe(() => ctx.result?.data?.gallery?.fields, {});
      const attributes = safe(() => detail?.featureAttributes || []);
      const skuMap = safe(() => trade?.skuMap || []);
      const freight = safe(() => global?.freightInfo || ctx.result?.data?.shippingServices?.fields?.freightInfo || {});
      const packInfo = safe(() => ctx.result?.data?.productPackInfo?.fields?.pieceWeightScale?.pieceWeightScaleInfo || []);
      const evalModule = safe(() => ctx.result?.data?.productEvaluation, null);

      return {
        title: safe(() => detail.subject || gallery.subject, ''),
        offerId: safe(() => detail.offerId || gallery.offerId, ''),
        priceDisplay: safe(() => priceModel.priceDisplay || trade.priceDisplay, ''),
        currency: 'CNY',
        images: safe(() => gallery.offerImgList || detail.imageList?.map(i => i.fullPathImageURI) || [], []),
        video: safe(() => ctx.result?.data?.gallery?.fields?.video?.videoUrl || '', ''),
        attributes: attributes.map(a => ({ name: a.name, value: a.value })),
        skus: skuMap.map(s => ({
          label: s.specAttrs,
          price: s.price,
          stock: s.canBookCount,
          skuId: s.skuId
        })),
        packaging: packInfo.map(p => ({
          skuId: p.skuId,
          color: p.sku1,
          weight_g: p.weight
        })),
        shipping: {
          location: safe(() => freight.location, ''),
          freeShipping: safe(() => freight.freeDeliverFee || freight.freePostage, false),
          deliveryLimitDays: safe(() => freight.deliveryLimit || 0, 0),
          excludeAreas: safe(() => freight.excludeAreaCodeList || freight.excludeAreaCode4FreePostage || [], [])
        },
        rating: {
          score: 5.0,
          count: safe(() => evalModule ? 1 : 0, 0)
        },
        sales: {
          period: safe(() => ctx.result?.data?.productTitle?.fields?.saleCountDate, ''),
          countText: safe(() => ctx.result?.data?.productTitle?.fields?.saleNum, '')
        },
        seller: {
          companyName: safe(() => global?.sellerModel?.companyName, ''),
          memberId: safe(() => global?.sellerModel?.memberId, ''),
          loginId: safe(() => global?.sellerModel?.loginId, ''),
          shopUrl: safe(() => global?.sellerModel?.winportUrl, '')
        }
      };
    }

    // Fallback DOM scrape (minimal)
    return {
      title: document.querySelector('#productTitle h1')?.textContent?.trim() || document.title || '',
      priceDisplay: document.querySelector('[data-module="od_main_price"] .price-info')?.textContent?.trim() || '',
      images: Array.from(document.querySelectorAll('[data-module="od_picture_gallery"] img'))
        .slice(0, 20)
        .map(i => i.src),
      attributes: Array.from(document.querySelectorAll('[data-module="od_product_attributes"] .field-value'))
        .map(n => n.textContent.trim())
    };
  });

  return data;
};

const main = async () => {
  const url = process.argv[2] || 'https://detail.1688.com/offer/951728697627.html';

  // const browser = await chromium.launch({ headless: true });
  const browser = await chromium.launch({ 
    headless: false, // Change from true to false
    channel: 'msedge', // Add this line
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    // userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/${ri(533, 605)}.36 (KHTML, like Gecko) Chrome/${ri(118, 125)}.0.${ri(1000, 9999)}.${ri(10, 99)} Safari/${ri(533, 605)}.36`,
    viewport: { width: ri(1200, 1440), height: ri(800, 1000) },
    deviceScaleFactor: 1 + Math.random() * 0.5,
    locale: 'zh-CN',
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive'
    }
  });

  const page = await context.newPage();

  // Random entry to page to look human
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await humanPause(page, 800, 1500);
  await humanScroll(page);
  await humanPause(page, 400, 900);

  const captchaSolved = await trySolveSlider(page);
if (!captchaSolved) {
  // If CAPTCHA still there, wait and try again
  await humanPause(page, 2000, 3000);
  await trySolveSlider(page);
}

// Wait for page to fully load after CAPTCHA
await humanPause(page, 1000, 2000);
  // Go to target
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await humanPause(page, 800, 1500);

  // If slider appears, try best-effort solve
  await trySolveSlider(page);

  // Let late scripts initialize
  await humanScroll(page);
  await humanPause(page, 600, 1200);

  // Small random mouse wander
  await humanMouseMove(page, [ri(100, 400), ri(100, 400)], [ri(600, 900), ri(300, 700)], ri(20, 35));

  // Data extraction
  const data = await extractData(page);

  // Output JSON only
  process.stdout.write(JSON.stringify({ ok: true, url, scrapedAt: new Date().toISOString(), data }, null, 2));

  await browser.close();
};

main().catch(async (err) => {
  // JSON error output only
  process.stdout.write(JSON.stringify({ ok: false, error: String(err) }));
  process.exit(1);
});



// content.js — ดึงข้อมูลสินค้าจากทุก platform อัตโนมัติ

(function () {
  function text(sel, root = document) {
    return root.querySelector(sel)?.textContent?.trim() || '';
  }
  function attr(sel, a, root = document) {
    return root.querySelector(sel)?.[a]?.trim() || '';
  }
  function meta(prop) {
    return document.querySelector(`meta[property="${prop}"],meta[name="${prop}"]`)?.content?.trim() || '';
  }

  function extractShopee() {
    const name =
      text('[class*="product-briefing"] h1') ||
      text('._3XJlRd') ||
      meta('og:title') ||
      document.title.replace(/\s*[|–-].*$/, '').trim();
    const price =
      text('._3_ISdg') || text('.pqTWkA') ||
      text('[class*="price--mainPrice"]') ||
      text('[class*="flex-no-overflow"]') || '';
    const image =
      attr('._3-gRUV img', 'src') ||
      attr('[class*="product-image"] img', 'src') ||
      meta('og:image');
    const { searchParams, pathname } = new URL(location.href);
    // Shopee URL: /product-name-i.SHOPID.ITEMID
    const match = pathname.match(/i\.(\d+)\.(\d+)/);
    return {
      name, price, image,
      platform: 'shopee',
      url: location.href,
      shopId: match?.[1] || '',
      itemId: match?.[2] || '',
    };
  }

  function extractLazada() {
    const name =
      text('.pdp-product-title') ||
      text('[class*="title--wrap"]') ||
      meta('og:title') ||
      document.title.replace(/\s*[|–-].*$/, '').trim();
    const price =
      text('.pdp-price') ||
      text('[class*="price-box"] .pdp-price') || '';
    const image =
      attr('.pdp-mod-product-badge-img img', 'src') ||
      attr('[class*="item-gallery"] img', 'src') ||
      meta('og:image');
    return { name, price, image, platform: 'lazada', url: location.href };
  }

  function extractAliExpress() {
    const name =
      text('.product-title-text') ||
      meta('og:title') ||
      document.title.replace(' - AliExpress', '').trim();
    const price =
      text('.product-price-value') || text('[class*="price"]') || '';
    const image = meta('og:image');
    return { name, price, image, platform: 'aliexpress', url: location.href };
  }

  function extractTikTokShop() {
    const name =
      text('[class*="product-title"]') ||
      meta('og:title') ||
      document.title;
    const price = text('[class*="price"]') || '';
    const image = meta('og:image');
    return { name, price, image, platform: 'tiktokshop', url: location.href };
  }

  function extractGeneric() {
    const name =
      text('h1[itemprop="name"], [itemprop="name"] h1') ||
      meta('og:title') ||
      text('h1') ||
      document.title;
    const price =
      text('[itemprop="price"]') ||
      text('[class*="price"][class*="current"], [id*="price"]') || '';
    const image = meta('og:image') || attr('img[class*="product"]', 'src');
    return { name, price, image, platform: 'generic', url: location.href };
  }

  function detect() {
    const h = location.hostname;
    if (h.includes('shopee'))      return extractShopee();
    if (h.includes('lazada'))      return extractLazada();
    if (h.includes('aliexpress'))  return extractAliExpress();
    if (h.includes('tiktok'))      return extractTikTokShop();
    return extractGeneric();
  }

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === 'EXTRACT_PRODUCT') reply(detect());
    return true;
  });
})();

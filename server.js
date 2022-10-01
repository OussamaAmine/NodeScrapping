const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const ouedknissProducts = async (html) => {
  const tree = cheerio.load(html);
  const dataJson = tree('script[type="application/ld+json"]').get(1).firstChild
    .data;
  const data = JSON.parse(dataJson);
  const products = [];
  data.forEach((object) => {
    const title = object.name;
    const desc = object.description;
    const img = object.image;
    const { price } = object.offers;

    products.push({
      title,
      desc,
      price,
      img,
    });
  });

  return products;
};

async function runOuedkniss(keyword) {
  // First, we must launch a browser instance
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });
  // then we need to start a browser tab
  const page = await browser.newPage();
  // and tell it to go to some URL
  await page.goto(
    `https://www.ouedkniss.com/s/1?keywords=${keyword.replace(' ', '-')}`,
    {
      waitUntil: 'load',
    }
  );

  const content = await page.content();

  // close everything
  await page.close();
  await browser.close();
  return content;
}

async function dubizzleProducts(page) {
  const tree = cheerio.load(page);
  const div1 = tree('div.listing-item').get();
  const products = [];

  div1.forEach((div) => {
    const title =
      div.childNodes[1].childNodes[1].childNodes[1].childNodes[3].children[0].data.trim();

    const price =
      div.childNodes[1].childNodes[3].childNodes[1].childNodes[0].data
        .trim()
        .split('AED')[1]
        .trim()
        .replace(',', '');
    //const url = div.childNodes[3].childNodes[1].childNodes[1].attribs.href;
    let img;
    let desc;
    if (
      div.childNodes[3].childNodes[1].childNodes[1].childNodes[1].attribs.style
    ) {
      img =
        div.childNodes[3].childNodes[1].childNodes[1].childNodes[1].attribs.style
          .split('(')[1]
          .split(')')[0];
      desc =
        div.childNodes[3].childNodes[3].childNodes[1].childNodes[1].childNodes[0].data.trim();
    } else {
      desc =
        div.childNodes[3].childNodes[1].childNodes[1].childNodes[1].childNodes[0].data.trim();
    }

    products.push({ title, desc, price, img });
  });
  return products;
}

async function runDubizzle(keyword) {
  // First, we must launch a browser instance
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });
  // then we need to start a browser tab
  let page = await browser.newPage();
  page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
  );
  // and tell it to go to some URL
  await page.goto(
    `https://dubai.dubizzle.com/search/?keywords=${keyword.replace(
      ' ',
      '+'
    )}&is_basic_search_widget=1&is_search=1`,
    {
      waitUntil: 'domcontentloaded',
    }
  );

  const content = await page.content();
  //console.log(content);
  // close everything
  await page.close();
  await browser.close();
  return content;
}

(async () => {
  //const dubizzleHTML = await runDubizzle('iphone 14');
  //const dubiProducts = await dubizzleProducts(p);
  //const ouedknissHTML = await runOuedkniss('iphone 14');
  //const ouedkProducts = await ouedknissProducts(pageHTML);
})();

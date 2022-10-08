const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);

const ouedknissProducts = async (html) => {
  const tree = cheerio.load(html);

  const dataJson = tree('script[type="application/ld+json"]')
    .filter((i, el) => el.parent.attribs.class === 'search-view mt-n1')
    .get(0).firstChild.data;

  //console.log(dataJson);
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
  const word = keyword.replaceAll(' ', '-');

  await page.goto(`https://www.ouedkniss.com/s/1?keywords=${word}`, {
    waitUntil: 'load',
  });

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

  const getImgDesc = (childs) => {
    let divBlocHasPhoto;
    let divBloc;
    childs.forEach((el) => {
      if (el.attribs) {
        if (el.attribs.class && el.attribs.class.includes('block has_photo'))
          divBlocHasPhoto = el;
        if (el.attribs.class && el.attribs.class === 'block') divBloc = el;
      }
    });
    let desc;
    let img;
    if (divBlocHasPhoto) {
      let divThumb;
      let divDescription;
      divBlocHasPhoto.childNodes.forEach((el) => {
        if (el.attribs) {
          if (el.attribs.class && el.attribs.class.includes('thumb'))
            divThumb = el;
          if (el.attribs.class && el.attribs.class.includes('description'))
            divDescription = el;
        }
      });
      let aImg;
      divThumb.childNodes.forEach((el) => {
        if (el.name && el.name === 'a') {
          aImg = el;
        }
      });
      let divImg;
      aImg.childNodes.forEach((el) => {
        if (el.name && el.name === 'div') divImg = el;
      });
      if (divImg.attribs && divImg.attribs.style) {
        img = divImg.attribs.style.split('(')[1].split(')')[0];
      }
      let divBlc;
      divDescription.childNodes.forEach((el) => {
        if (el.attribs) {
          if (el.attribs.class && el.attribs.class.includes('block'))
            divBlc = el;
        }
      });
      let pBreadcrumbs;
      divBlc.childNodes.forEach((el) => {
        if (el.attribs) {
          if (el.attribs.class && el.attribs.class.includes('breadcrumbs'))
            pBreadcrumbs = el;
        }
      });

      desc = pBreadcrumbs.children[0].data.trim();
    }
    if (divBloc) {
      let divDescriptionIndented;
      divBloc.childNodes.forEach((el) => {
        if (el.attribs) {
          if (
            el.attribs.class &&
            el.attribs.class.includes('description indented')
          )
            divDescriptionIndented = el;
        }
      });
      let divBlc;
      divDescriptionIndented.childNodes.forEach((el) => {
        if (el.attribs) {
          if (el.attribs.class && el.attribs.class.includes('block'))
            divBlc = el;
        }
      });
      let pBreadcrumbs;
      divBlc.childNodes.forEach((el) => {
        if (el.attribs) {
          if (el.attribs.class && el.attribs.class.includes('breadcrumbs'))
            pBreadcrumbs = el;
        }
      });

      desc = pBreadcrumbs.children[0].data.trim();
      img = null;
    }

    return { img, desc };
  };

  const getTitlePrice = (childs) => {
    let divBlocItemTitle;
    childs.forEach((el) => {
      if (el.attribs) {
        if (el.attribs.class && el.attribs.class.includes('block item-title'))
          divBlocItemTitle = el;
      }
    });
    let h2ResultsListingTitle;
    let divPrice;
    divBlocItemTitle.childNodes.forEach((el) => {
      if (el.attribs) {
        if (
          el.attribs.class &&
          el.attribs.class.includes('results-listing-title')
        )
          h2ResultsListingTitle = el;
        if (el.attribs.class && el.attribs.class.includes('price'))
          divPrice = el;
      }
    });

    let spanTitle;
    h2ResultsListingTitle.childNodes.forEach((el) => {
      if (el.attribs) {
        if (el.attribs.class && el.attribs.class.includes('title'))
          spanTitle = el;
      }
    });
    let aLpvLinkItem;
    spanTitle.childNodes.forEach((el) => {
      if (el.attribs) {
        if (el.attribs.class && el.attribs.class.includes('lpv-link-item'))
          aLpvLinkItem = el;
      }
    });
    let spanSellingPriceAmount;
    divPrice.childNodes.forEach((el) => {
      if (el.attribs) {
        if (
          el.attribs.class &&
          el.attribs.class.includes('selling-price__amount')
        )
          spanSellingPriceAmount = el;
      }
    });

    const title = aLpvLinkItem.children[0].data.trim();
    const price = spanSellingPriceAmount.children[0].data
      .trim()
      .split('AED')[1]
      .trim()
      .replace(',', '');

    return { title, price };
  };
  div1.forEach((div) => {
    const titlePrice = getTitlePrice(div.childNodes);
    const imgDesc = getImgDesc(div.childNodes);
    const { img, desc } = imgDesc;
    const { title, price } = titlePrice;

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
  const word = keyword.replaceAll(' ', '+');
  await page.goto(
    `https://dubai.dubizzle.com/search/?keywords=${word}&is_basic_search_widget=1&is_search=1`,
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
  //const dubiProducts = await dubizzleProducts(dubizzleHTML);
  //const ouedknissHTML = await runOuedkniss('iphone  14');
  // await writeFileAsync(path.join(__dirname, 'ddfile.html'), dubizzleHTML);
  // const ouedkProducts = await ouedknissProducts(ouedknissHTML);
  // console.log(ouedkProducts);
  // console.log('-----------------------------------------------------');
  // console.log(dubiProducts);
})();

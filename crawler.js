const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

const languages = ['en', 'zh-TW'];
const BASE_URL = 'https://maicoin2.freshdesk.com/';
const SUB_URL = '/support/solutions/articles/';
const ARTICLE_URL_PAGE_1 = 'https://maicoin2.freshdesk.com/support/solutions/folders/32000034455';
const ARTICLE_URL_PAGE_2 = 'https://maicoin2.freshdesk.com/support/solutions/folders/32000034455/page/2';
const coinpedia = {
  en: {},
  'zh-TW': {},
};
const sortedCoinpedia = {
  en: {},
  'zh-TW': {},
};

const fetch = (url) => {
    console.log('Processing', url);
    return new Promise(function (resolve, reject) {
      request(url, function(error, response, body) {
        if(error) {
          console.log("Error: " + error);
          reject(error);
        }
        console.log("Status code: " + response.statusCode);
        resolve(body);
      });
    });
};

const parseURL = ($, articles) => {
  $('li.articles__item').each(function( index ) {
    const link = $(this).find('a').attr('href');
    const item = link.split(SUB_URL);
    const id = item[1].split('-')[0];
    articles.push(id);
  });
};

const crawl = (url, locale) => {
  return new Promise(function (resolve, reject) {
    request(url, function(error, response, body) {
      if(error) {
        console.log("Error: " + error, '@', url);
        reject(error);
      }
      console.log("Status code: " + response.statusCode, '@', url);

      var $ = cheerio.load(body);
      const title = $('header.article-header').find('h1').text().trim();
      const symbol = title.match(/\(([^)]+)\)/);
      let currency = title.toLowerCase();
      if (symbol) {
        currency = symbol[1].trim().toLowerCase();
      }
      let introduction = '';
      $('div.article__body').find('p').each(function(index) {
         introduction += $(this).text().replace('\'', '\\\'') + '\\n\\n';
     });

      if (currency && introduction) {
        coinpedia[locale][currency] = introduction;
        // fs.appendFileSync(`coinpedia_${locale}.json`, `${currency}: '${introduction}',\n`);
      }
      resolve(body);
    });
  });
};

const parseArticles = articles => {
  Promise.all(articles.map(id => {
    return Promise.all(languages.map(locale => {
      const url = `${BASE_URL}${locale}${SUB_URL}${id}`;
      console.log('Visit ', url);
      return crawl(url, locale);
    }));
  })).then(() => {
    languages.map(locale => {
      Object.keys(coinpedia[locale]).sort().forEach((key) => {
        sortedCoinpedia[locale][key] = coinpedia[locale][key];
      });
      fs.writeFile(`coinpedia_${locale}.json`, JSON.stringify(sortedCoinpedia[locale], null, 2) + '\r\n',
        (error) => {
          if (error) {
            return console.log(err);
          } else {
            console.log('success.!');
          }
        });
    });
  });
};

const printResult = () => {
  languages.map(locale => {
    console.log(JSON.parse(fs.readFileSync(`coinpedia_${locale}.json`).toString()));
  });
};

const main = () => {
  fetch(ARTICLE_URL_PAGE_1)
  .then(body => {
    const articles = [];

    const $ = cheerio.load(body);
    parseURL($, articles);

    fetch(ARTICLE_URL_PAGE_2)
    .then(body => {
      const $ = cheerio.load(body);
      parseURL($, articles);
      return articles;
    })
    .then(articles => {
      console.log(articles);
      parseArticles(articles);
      printResult();
    });
  });
}

main();

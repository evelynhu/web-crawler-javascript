const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

const languages = ['en', 'zh-TW'];
const BASE_URL = 'https://maicoin2.freshdesk.com/';
const SUB_URL = '/support/solutions/articles/';
const ARTICLE_URL_PAGE_1 = 'https://maicoin2.freshdesk.com/support/solutions/folders/32000034455';
const ARTICLE_URL_PAGE_2 = 'https://maicoin2.freshdesk.com/support/solutions/folders/32000034455/page/2';

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
  request(url, function(error, response, body) {
    if(error) {
      console.log("Error: " + error, '@', url);
    }
    console.log("Status code: " + response.statusCode, '@', url);

    var $ = cheerio.load(body);
    const title = $('header.article-header').find('h1').text().trim();
    const symbol = title.match(/\(([^)]+)\)/);
    let currency = title.toLowerCase();
    if (symbol) {
      currency = symbol[1].trim().toLowerCase();
    }
    const introduction = $('div.article__body').find('p').text().trim();
    fs.appendFileSync(`coinpedia_${locale}.txt`, `${currency}: ${introduction},\n`);
  });
};

const parseArticles = articles => {
  articles.map(id => {
    languages.map(locale => {
      const url = `${BASE_URL}${locale}${SUB_URL}${id}`;
      console.log('Visit ', url);
      crawl(url, locale);
    })
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
    });
  });
}

main();

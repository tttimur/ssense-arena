const puppeteer = require("puppeteer");
const inquirer = require("inquirer");
const fetch = require("node-fetch")
const fs = require("fs");

const APIPrefix = `https://api.are.na/v2`
let arenaSlug = undefined
let arenaAccessToken = undefined

let scrape = async () => {
  console.log('booting up...')

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  var questions = [
    {
      type: "input",
      name: "ssense-email",
      message: "What's your SSense email?"
    },
    {
      type: "password",
      name: "ssense-pw",
      message: "What's your SSense password?"
    },
    {
      type: "input",
      name: "arena-slug",
      message: "What's your are.na channel slug?"
    },
    {
      type: "input",
      name: "arena-access-token",
      message: "What's your are.na access token?"
    }
  ];
  await page.goto("https://www.ssense.com/en-us/account/login");
  await inquirer.prompt(questions).then(answers => {
    let se = answers["ssense-email"];
    let sp = answers["ssense-pw"];
    
    arenaSlug = answers["arena-slug"];
    arenaAccessToken = answers["arena-access-token"]

    page.$eval("input[name=email]", (el, _se) => (el.value = _se), se);
    page.$eval("input[name=password]", (el, _sp) => (el.value = _sp), sp);
    page.$eval(
      "#wrap > div > div > div > div.login-section.span5.offset2.no-padding.tablet-landscape-full-fluid-width > form",
      form => form.submit()
    );
  });
  await page.waitFor(1000);
  await page.goto("https://www.ssense.com/en-us/account/wishlist");
  await page.waitFor(1000);

  const result = await page.evaluate(() => {
    let arr = [];
    let items = document.querySelectorAll(".browsing-product-item > a");

    items.forEach(item => {
      arr.push({ link: item.href })
    });
    return arr;
  });

  browser.close();
  return result;
};

let writeToFile = async value => {
  fs.writeFile(
    "results.json",
    JSON.stringify(value),
    function (err) {
      if (err) throw err;
      console.log("File is created successfully.");
    }
  );
}

let publishResultsToArena = async value => {
  if (arenaAccessToken == null) return 'Access Token undefined'
  if (arenaSlug == null) return 'Slug is not valid'
  
  value.forEach(async (item) => {
    try {
      const url = `${APIPrefix}/channels/${arenaSlug}/blocks?access_token=${arenaAccessToken}`
      const data = {
        "source": item.link
      }

      await fetch(`${APIPrefix}/channels/${arenaSlug}/blocks?access_token=${arenaAccessToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      })

      console.log(`success: ${item.link}`)
    } catch (err) {
      console.log(err)
    }
  })
}

// scrape().then(writeToFile);
scrape().then(publishResultsToArena)

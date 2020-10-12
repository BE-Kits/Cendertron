import { defaultCrawlerOption } from './../config';
/** Puppeteer 操作类 */
import * as puppeteer from 'puppeteer';
import { createPuppeteerPool } from './puppeteer-pool';

import { MOBILE_USERAGENT } from '../crawler/types';
import { CrawlerOption } from '../crawler/CrawlerOption';
import { logger } from '../crawler/supervisor/logger';
import { defaultPuppeteerPoolConfig } from '../config';

// 全局唯一的 Browser 对象
export let defaultBrowserHolder: {
  browser?: puppeteer.Browser;
  isReseting: boolean;
} = {
  isReseting: false
};

export async function initDefaultBrowser() {
  if (defaultBrowserHolder.isReseting) {
    return;
  }

  try {
    defaultBrowserHolder.isReseting = true;
    if (defaultBrowserHolder.browser) {
      await defaultBrowserHolder.browser.removeAllListeners();
      await defaultBrowserHolder.browser.close();
    }

    defaultBrowserHolder.browser = await initPuppeteer();
    defaultBrowserHolder.browser.setMaxListeners(1024);
    defaultBrowserHolder.isReseting = false;
  } catch (e) {
    console.error(e);
  }
}

/** 初始化 Puppeteer */
export async function initPuppeteer() {
  let browser;

  logger.info('>>>puppeteer>>initPuppeteer');

  if (process.env.NODE_ENV === 'development') {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox']
    });
  } else {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--headless',
        '--no-sandbox',
        '--remote-debugging-port=9222'
      ]
    });
  }

  return browser;
}

let puppeteerArgs = [];

if (process.env.NODE_ENV === 'development') {
  puppeteerArgs = [
    {
      headless: false,
      args: ['--no-sandbox']
    }
  ];
} else {
  puppeteerArgs = [
    {
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--headless',
        '--no-sandbox',
        '--remote-debugging-port=9222'
      ]
    }
  ];
}

// Returns a generic-pool instance
export const pool = createPuppeteerPool({
  ...defaultPuppeteerPoolConfig,
  puppeteerArgs
} as any);

/** 初始化页面 */
export async function initPage(
  browser: puppeteer.Browser,
  options: Partial<CrawlerOption> = defaultCrawlerOption
) {
  const page = await browser.newPage();

  // 屏蔽所有弹窗
  page.on('dialog', dialog => {
    dialog.dismiss();
  });

  // 禁止下载
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'deny'
  });

  await page.evaluateOnNewDocument('customElements.forcePolyfill = true');
  await page.evaluateOnNewDocument('ShadyDOM = {force: true}');
  await page.evaluateOnNewDocument('ShadyCSS = {shimcssproperties: true}');

  if (options.isMobile) {
    page.setUserAgent(MOBILE_USERAGENT);
  }

  // 设置容错
  page.once('error', e => {
    logger.error('page-error>>>', e.message);
  });

  return page;
}

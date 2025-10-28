// Lås Chrome-path og -flags så LHCI ikke kan ignorere dem
module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173'],
      numberOfRuns: 1,
      chromePath: process.env.CHROME_PATH,
      chromeFlags: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--headless=new',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    },
    assert: {
      preset: 'lighthouse:no-pwa'
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouse'
    }
  }
};

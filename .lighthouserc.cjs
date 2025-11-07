const chromeFlags = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
];

const collect = {
  url: ['http://127.0.0.1:4173'],
  numberOfRuns: 1,
  chromeFlags,
};

if (process.env.CHROME_PATH) {
  collect.chromePath = process.env.CHROME_PATH;
}

module.exports = {
  ci: {
    collect,
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.98}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.95}],
        'categories:seo': ['error', {minScore: 0.90}],
        'categories:pwa': ['error', {minScore: 0.90}],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouse',
    },
  },
};

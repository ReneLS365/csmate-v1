const chromeFlags = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage'
];

const collect = {
  url: ['http://127.0.0.1:4173'],
  numberOfRuns: 1,
  chromePath: process.env.CHROME_PATH,
  chromeFlags
};

if (!collect.chromePath) {
  delete collect.chromePath;
}

export default {
  ci: {
    collect,
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 1 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'categories:pwa': ['error', { minScore: 1 }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouse'
    }
  }
};

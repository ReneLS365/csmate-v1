module.exports = {
  ci: {
    collect: { numberOfRuns: 1 },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 1 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'categories:pwa': ['error', { minScore: 1 }]
      }
    }
  }
};

export default {
  import: ['features/step_definitions/**/*.js'],
  format: [
    'progress',
    'json:reports/cucumber-report.json',
    'allure-cucumberjs/reporter',
  ],
  formatOptions: {
    resultsDir: 'allure-results',
  },
};

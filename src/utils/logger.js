import chalk from 'chalk';

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info: (message) => {
    console.log(chalk.blue('ℹ'), message);
  },

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success: (message) => {
    console.log(chalk.green('✓'), message);
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn: (message) => {
    console.log(chalk.yellow('⚠'), message);
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  error: (message) => {
    console.log(chalk.red('✗'), message);
  },

  /**
   * Log debug message (only in development)
   * @param {string} message - Message to log
   */
  debug: (message) => {
    if (isDev) {
      console.log(chalk.gray('→'), message);
    }
  },

  /**
   * Log section header
   * @param {string} title - Section title
   */
  section: (title) => {
    console.log('\n' + chalk.bold.cyan(`\n━━━ ${title} ━━━\n`));
  },
};

import chalk from 'chalk';

const isDev = process.env.NODE_ENV === 'development';

const transports = [];

const writeToTransports = (text) => {
  transports.forEach(t => t.write(text));
};

export const logger = {
  /**
   * Add a writable stream transport for plain-text log output.
   * @param {object} stream - Object with a write(string) method
   */
  addTransport: (stream) => {
    transports.push(stream);
  },

  /**
   * Remove a previously added transport.
   * @param {object} stream - The transport to remove
   */
  removeTransport: (stream) => {
    const idx = transports.indexOf(stream);
    if (idx >= 0) transports.splice(idx, 1);
  },

  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info: (message) => {
    console.log(chalk.blue('ℹ'), message);
    writeToTransports(`[INFO] ${message}\n`);
  },

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success: (message) => {
    console.log(chalk.green('✓'), message);
    writeToTransports(`[SUCCESS] ${message}\n`);
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn: (message) => {
    console.log(chalk.yellow('⚠'), message);
    writeToTransports(`[WARN] ${message}\n`);
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  error: (message) => {
    console.log(chalk.red('✗'), message);
    writeToTransports(`[ERROR] ${message}\n`);
  },

  /**
   * Log debug message (only in development)
   * @param {string} message - Message to log
   */
  debug: (message) => {
    if (isDev) {
      console.log(chalk.gray('→'), message);
      writeToTransports(`[DEBUG] ${message}\n`);
    }
  },

  /**
   * Log section header
   * @param {string} title - Section title
   */
  section: (title) => {
    console.log('\n' + chalk.bold.cyan(`\n━━━ ${title} ━━━\n`));
    writeToTransports(`\n=== ${title} ===\n`);
  },
};

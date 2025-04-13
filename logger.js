const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs/ directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure Logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\n${stack}` : ''}`;
    })
  ),
  transports: [
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new transports.Console(),
  ],
});

module.exports = logger;
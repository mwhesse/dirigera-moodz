import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tradfri-music-sync' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

// In development, also log to console with colorized output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Safe handling of metadata to avoid circular JSON errors
        let metaString = '';
        try {
          if (Object.keys(meta).length) {
             // Create a safe copy or just don't log complex objects in console
             // For safety, we'll just log 'MetaData' placeholder if it fails stringify
             metaString = JSON.stringify(meta, null, 2);
          }
        } catch (e) {
          metaString = '[Complex/Circular Data]';
        }
        return `${timestamp} [${level}]: ${message} ${metaString}`;
      })
    )
  }));
}
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const defaultLogLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

const loggerOptions: pino.LoggerOptions = {
  level: defaultLogLevel,
};

// Use pino-pretty for development environment if installed
if (!isProduction) {
  try {
    // Dynamically require pino-pretty only in dev mode
    require.resolve('pino-pretty');
    loggerOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname', // Optional: Hide PID and hostname
      },
    };
  } catch (error) {
    console.warn('pino-pretty not found, using default JSON logging.');
    // Fallback to default JSON logging if pino-pretty is not available
  }
}

const logger = pino(loggerOptions);

export default logger; 

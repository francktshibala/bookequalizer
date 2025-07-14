interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

type LogLevelType = LogLevel[keyof LogLevel];

interface LogEntry {
  level: LogLevelType;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private formatMessage(level: LogLevelType, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data })
    };
  }

  private log(level: LogLevelType, message: string, data?: any): void {
    const logEntry = this.formatMessage(level, message, data);
    
    // In development, use console with colors
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        debug: '\x1b[35m',
        reset: '\x1b[0m'
      };
      
      const color = colors[level] || colors.info;
      console.log(
        `${color}[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`,
        data ? data : ''
      );
    } else {
      // In production, use structured JSON logging
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message: string | any, data?: any): void {
    if (typeof message === 'object') {
      this.log(LOG_LEVELS.ERROR, 'Error occurred', message);
    } else {
      this.log(LOG_LEVELS.ERROR, message, data);
    }
  }

  warn(message: string, data?: any): void {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

export const logger = new Logger();
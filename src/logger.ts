import pino from 'pino';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

let baseLogger;

if (process.env.NODE_ENV === "production") {
  console.log("PROD")
  baseLogger = pino({
    level: 'info',
    transport: {
      targets: [
        {
          // daily rolling info logs
          target: 'pino-roll',
          options: {
            file: path.join(logsDir, 'info.log'),
            frequency: 'daily',
            size: '10m', // Also rotate at 10mb
            mkdir: true,
            dateFormat: 'yyyy-MM-dd'
          },
          level: 'info',
        },
        {
          // daily rolling error logs
          target: 'pino-roll',
          options: {
            file: path.join(logsDir, 'error.log'),
            frequency: 'daily',
            size: '10m', // also roll at 10mb
            mkdir: true,
            dateFormat: 'yyyy-MM-dd'
          },
          level: 'error',
        },
        {
          // log errors to console
          target: 'pino/file',
          options: {
            destination: 1, // stdout
          },
          level: 'error',
        },
      ],
    },
  });
} else {
  baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        hideObject: false,
      },
    },
  })
}

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = req.requestId || randomUUID();
  req.startTime = Date.now();

  req.logger = baseLogger.child({
    requestId: req.requestId.substring(0, 8),
    method: req.method,
    url: req.route?.path || req.url,
    ip: req.ip,
  });

  req.logger.info('Request received');

  const originalSend = res.send;
  res.send = function(data: any) {
    req.logger.info({
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime + "ms",
    }, 'Request completed');
    return originalSend.call(this, data);
  };

  next();
};

export const addUserToLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    req.logger = req.logger.child({
      userId: req.user.id.substring(0, 8),
      userEmail: req.user.email,
      emailVerified: req.user.emailVerified === 1,
    });
  }
  next();
};

export const addBlogToLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.selectedBlog) {
    req.logger = req.logger.child({
      selectedBlogId: req.selectedBlog.id.substring(0, 8),
      selectedBlogTitle: req.selectedBlog.title,
    });
  }
  next();
};

export const addSessionToLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.token) {
    req.logger = req.logger.child({
      sessionUuid: req.token.uuid.substring(0, 8),
      sessionExp: (new Date(req.token.exp)).toString(),
      sessionIat: (new Date(req.token.iat)).toString(),
    });
  }
  next();
};


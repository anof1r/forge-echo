import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { readEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const environment = readEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  const staticRoot = process.env['STATIC_ROOT'];
  if (staticRoot) {
    app.useStaticAssets(staticRoot);
    // SPA fallback: any non-API GET returns the client shell.
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
      response.sendFile(join(staticRoot, 'index.html'));
    });
  }
  await app.listen(environment.port, '0.0.0.0');
  Logger.log(
    `Forge Echo is available on port ${environment.port}; Battle Forge is ${environment.battleForgeUrl}.`,
    'Bootstrap',
  );
}

void bootstrap();

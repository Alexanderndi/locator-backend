import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express';
import express, { type Express, type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

let cachedServer: Express | undefined;

async function getServer() {
  if (cachedServer) {
    return cachedServer;
  }

  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );

  configureApp(app);
  await app.init();

  cachedServer = server;
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await getServer();
  return server(req, res);
}

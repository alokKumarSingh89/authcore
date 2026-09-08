import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1', {
    exclude: ['.well-known/jwks.json'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  return app;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for local development with frontend on both 3000 and 3001
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
  });

  const port = process.env.PORT || 4010;
  await app.listen(port);
  console.log(`Backend is running on http://localhost:${port}`);
}
bootstrap();

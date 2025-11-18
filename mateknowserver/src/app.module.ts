import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClaseModule } from './clase/clase.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AnuncioModule } from './anuncio/anuncio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env',
    }),
    AuthModule,
    ClaseModule,
    UsuarioModule,
    AnuncioModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
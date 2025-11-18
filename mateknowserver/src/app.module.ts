import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClaseModule } from './clase/clase.module';
import { UsuarioModule } from './usuario/usuario.module';
import { ActividadModule } from './actividad/actividad.module';
import { EvaluacionModule } from './evaluacion/evaluacion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env',
    }),
    AuthModule,
    ClaseModule,
    UsuarioModule,
    // Módulo de actividades
    ActividadModule,
    // Módulo de evaluaciones (intentos, respuestas, historial)
    EvaluacionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
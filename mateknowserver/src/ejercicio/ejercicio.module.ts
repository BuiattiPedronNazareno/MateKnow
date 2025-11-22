import { Module } from '@nestjs/common';
import { EjercicioController } from './ejercicio.controller';
import { EjercicioService } from './ejercicio.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';
import { ProgrammingService } from '../ejercicio-programming/programming.service';
import { EjercicioProgrammingController } from './ejercicio-programming.controller';

@Module({
  imports: [AuthModule],
  controllers: [EjercicioController, EjercicioProgrammingController],
  providers: [EjercicioService, ProgrammingService, SupabaseService],
  exports: [EjercicioService, ProgrammingService],
})
export class EjercicioModule {}

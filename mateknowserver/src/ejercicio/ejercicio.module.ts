import { Module } from '@nestjs/common';
import { EjercicioController } from './ejercicio.controller';
import { EjercicioService } from './ejercicio.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EjercicioController],
  providers: [EjercicioService, SupabaseService],
  exports: [EjercicioService],
})
export class EjercicioModule {}

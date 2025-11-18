import { Module } from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EvaluacionController],
  providers: [EvaluacionService, SupabaseService],
})
export class EvaluacionModule {}

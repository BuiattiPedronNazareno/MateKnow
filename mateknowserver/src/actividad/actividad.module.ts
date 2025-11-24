import { Module } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { ActividadController } from './actividad.controller';
import { ActividadPublicController } from './actividad-public.controller';
import { SupabaseService } from '../lib/supabase.service';
import { RankingGateway } from './ranking.gateway';
import { ProgrammingModule } from '../ejercicio-programming/programming.module';

@Module({
  imports: [
    ProgrammingModule
  ],
  controllers: [
    ActividadController,
    ActividadPublicController
  ],
  providers: [ActividadService, SupabaseService, RankingGateway],
  exports: [ActividadService, RankingGateway],
})
export class ActividadModule { }
import { Module } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { ActividadController } from './actividad.controller';
import { ActividadPublicController } from './actividad-public.controller';
import { SupabaseService } from '../lib/supabase.service';

@Module({
  controllers: [
    ActividadController, 
    ActividadPublicController 
  ],
  providers: [ActividadService, SupabaseService],
  exports: [ActividadService],
})
export class ActividadModule {}
import { Module } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { NotificacionController } from './notificacion.controller';
import { SupabaseService } from '../lib/supabase.service'; 

@Module({
  controllers: [NotificacionController],
  providers: [
    NotificacionService, 
    SupabaseService 
  ],
  exports: [NotificacionService] 
})
export class NotificacionModule {}
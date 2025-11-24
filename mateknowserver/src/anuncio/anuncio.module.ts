import { Module } from '@nestjs/common';
import { AnuncioController } from './anuncio.controller';
import { AnuncioService } from './anuncio.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';
import { NotificacionModule } from '../notificacion/notificacion.module';

@Module({
  imports: [NotificacionModule, AuthModule],
  controllers: [AnuncioController],
  providers: [AnuncioService, SupabaseService],
  exports: [AnuncioService],
})
export class AnuncioModule {}


import { Module } from '@nestjs/common';
import { AnuncioController } from './anuncio.controller';
import { AnuncioService } from './anuncio.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnuncioController],
  providers: [AnuncioService, SupabaseService],
  exports: [AnuncioService],
})
export class AnuncioModule {}
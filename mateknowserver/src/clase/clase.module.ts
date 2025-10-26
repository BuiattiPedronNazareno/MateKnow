import { Module } from '@nestjs/common';
import { ClaseController } from './clase.controller';
import { ClaseService } from './clase.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ClaseController],
  providers: [ClaseService, SupabaseService],
  exports: [ClaseService],
})
export class ClaseModule {}
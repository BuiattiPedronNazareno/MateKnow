import { Module } from '@nestjs/common';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsuarioController],
  providers: [UsuarioService, SupabaseService],
  exports: [UsuarioService],
})
export class UsuarioModule {}
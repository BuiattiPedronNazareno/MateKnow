import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from '../lib/supabase.service';
import { AuthGuard } from './guards/auth.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
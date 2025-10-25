import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Headers } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Inicia sesión con email y password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /auth/register
   * Registra un nuevo usuario
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/logout
   * Cierra la sesión del usuario actual
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('access_token') access_token: string) {
    return this.authService.logout(access_token);
  }

  /**
   * POST /auth/validate
   * Valida un access token de Supabase y devuelve la info del usuario
   */
  @Post('validate')
@HttpCode(HttpStatus.OK)
async validate(@Headers('authorization') authHeader: string) {
  const token = authHeader?.replace('Bearer ', '');
  return this.authService.validateToken(token);
}
}
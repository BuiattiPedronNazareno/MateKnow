// ====================================
// ARCHIVO: src/versus/versus.module.ts
// ====================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { VersusController } from './versus.controller';
import { VersusService } from './versus.service';
import { VersusGateway } from './versus.gateway';


/**
 * Módulo del Modo Versus
 * Incluye WebSockets, Redis y endpoints REST
 */
@Module({
  imports: [
    ConfigModule, // Para acceder a las variables de entorno
    AuthModule,
  ],
  controllers: [VersusController],
  providers: [VersusService, VersusGateway],
  exports: [VersusService], // Por si otros módulos necesitan acceder
})
export class VersusModule {}
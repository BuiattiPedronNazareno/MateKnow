import { Module } from '@nestjs/common';
import { ProgrammingService } from './programming.service';
import { ProgrammingController } from './programming.controller';

@Module({
  controllers: [ProgrammingController],
  providers: [ProgrammingService],
  exports: [ProgrammingService],
})
export class ProgrammingModule {}

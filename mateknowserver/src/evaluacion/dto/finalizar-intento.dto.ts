import { IsString, IsNotEmpty } from 'class-validator';

export class FinalizarIntentoDto {
  @IsString()
  @IsNotEmpty()
  registroId: string;
}

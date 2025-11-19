import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateComentarioDto {
  @IsString()
  @IsNotEmpty()
  contenido: string;
}
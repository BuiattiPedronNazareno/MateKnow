import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO para seleccionar una pregunta
 */
export class SelectQuestionDto {
  @IsNotEmpty({ message: 'El ID de la lobby es obligatorio' })
  @IsUUID('4', { message: 'El lobbyId debe ser un UUID válido' })
  lobbyId: string;

  @IsNotEmpty({ message: 'El ID de la pregunta es obligatorio' })
  @IsString({ message: 'El questionId debe ser un string' })
  questionId: string;
}
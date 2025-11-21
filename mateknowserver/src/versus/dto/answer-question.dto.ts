import { IsNotEmpty, IsNumber, IsString, IsUUID, Min, Max } from 'class-validator';

/**
 * DTO para responder una pregunta
 */
export class AnswerQuestionDto {
  @IsNotEmpty({ message: 'El ID de la lobby es obligatorio' })
  @IsUUID('4', { message: 'El lobbyId debe ser un UUID válido' })
  lobbyId: string;

  @IsNotEmpty({ message: 'El ID de la pregunta es obligatorio' })
  @IsString({ message: 'El questionId debe ser un string' })
  questionId: string;

  @IsNotEmpty({ message: 'La opción seleccionada es obligatoria' })
  @IsNumber({}, { message: 'La opción debe ser un número' })
  @Min(0, { message: 'La opción debe ser entre 0 y 3' })
  @Max(3, { message: 'La opción debe ser entre 0 y 3' })
  selectedOption: number;

  @IsNotEmpty({ message: 'El tiempo de respuesta es obligatorio' })
  @IsNumber({}, { message: 'El tiempo debe ser un número' })
  @Min(0, { message: 'El tiempo no puede ser negativo' })
  timeSeconds: number;
}
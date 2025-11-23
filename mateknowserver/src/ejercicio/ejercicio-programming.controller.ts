import { 
    Body, 
    Controller, 
    Post, 
    Put, 
    Delete, 
    Param, 
    UseGuards, 
    Request,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    BadRequestException,
    Logger,
  } from '@nestjs/common';
  import { CreateProgrammingExerciseDto } from '../ejercicio-programming/dto/create-programming-exercise.dto';
  import { ProgrammingService } from '../ejercicio-programming/programming.service';
  import { UpdateProgrammingExerciseDto } from '../ejercicio-programming/dto/update-programming-exercise.dto';
  import { AuthGuard } from '../auth/guards/auth.guard';
  import { SupabaseService } from '../lib/supabase.service';
  
  @Controller('ejercicio/programming')
  @UseGuards(AuthGuard)
  export class EjercicioProgrammingController {
    private readonly logger = new Logger(EjercicioProgrammingController.name);
  
    constructor(
      private readonly programmingService: ProgrammingService,
      private readonly supabaseService: SupabaseService,
    ) {}
  
    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() dto: CreateProgrammingExerciseDto, 
      @Request() req
    ) {
      const supabase = this.supabaseService.getClient(req.token);
  
      try {
        if (!dto.tipoId || !dto.enunciado?.trim()) {
          throw new BadRequestException('TipoId y enunciado son obligatorios');
        }
  
        if (!dto.metadata?.lenguaje?.trim()) {
          throw new BadRequestException('El lenguaje es obligatorio');
        }
  
        if (!dto.tests || dto.tests.length === 0) {
          throw new BadRequestException('Debe agregar al menos un caso de prueba');
        }
  
        this.logger.log('📥 Creating programming exercise...');
  
        const { data: ejercicioData, error: ejercicioError } = await supabase
          .from('ejercicio')
          .insert({
            tipo_id: dto.tipoId,
            enunciado: dto.enunciado.trim(),
            puntos: dto.puntos ?? 1,
            metadata: {
              lenguaje: dto.metadata.lenguaje,
              boilerplate: dto.metadata.boilerplate || '',
            },
            creado_por: req.user.id,
          })
          .select()
          .single();
  
        if (ejercicioError || !ejercicioData) {
          this.logger.error(`❌ Error creating ejercicio: ${ejercicioError?.message}`);
          throw new InternalServerErrorException(
            'Error al crear ejercicio: ' + (ejercicioError?.message || 'Unknown')
          );
        }
  
        const ejercicioId = ejercicioData.id;
        this.logger.log(`✅ Ejercicio created with ID: ${ejercicioId}`);
  
        // 2. CREAR TEST CASES
        const testCasesCreated: any[] = [];
        for (const testCase of dto.tests) {
          try {
            const createdTest = await this.programmingService.createTestCase({
              ejercicio_id: ejercicioId,
              stdin: testCase.stdin || '',
              expected: testCase.expected,
              weight: testCase.weight ?? 1,
              timeout_seconds: testCase.timeout_seconds ?? 3,
              public: testCase.public ?? false,
            });
            testCasesCreated.push(createdTest);
          } catch (err: any) {
            this.logger.error(`❌ Error creating test case: ${err.message}`);
            await supabase.from('ejercicio').delete().eq('id', ejercicioId);
            throw new InternalServerErrorException(
              'Error al crear casos de prueba: ' + err.message
            );
          }
        }
  
        this.logger.log(`✅ Created ${testCasesCreated.length} test cases`);
  
        return {
          message: 'Ejercicio de programación creado exitosamente',
          ejercicio: {
            id: ejercicioId,
            tipo_id: ejercicioData.tipo_id,
            enunciado: ejercicioData.enunciado,
            puntos: ejercicioData.puntos,
            metadata: ejercicioData.metadata,
            creado_por: ejercicioData.creado_por,
            creado_at: ejercicioData.creado_at,
            testCases: testCasesCreated,
          },
        };
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof InternalServerErrorException
        ) {
          throw error;
        }
        this.logger.error('❌ Unexpected error in create:', error);
        throw new InternalServerErrorException('Error al crear ejercicio de programación');
      }
    }
  
    @Put(':id')
    async update(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateProgrammingExerciseDto,
      @Request() req
    ) {
      return await this.programmingService.updateProgrammingExercise(id, dto);
    }
  
    @Delete(':id')
    async delete(
      @Param('id', ParseUUIDPipe) id: string,
      @Request() req
    ) {
      await this.programmingService.deleteProgrammingExercise(id);
      return { message: 'Ejercicio de programación eliminado' };
    }
  }
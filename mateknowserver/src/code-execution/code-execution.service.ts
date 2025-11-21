import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  error?: string;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  expected: string;
  got: string;
  output: string;
  time: number;
  error?: string;
}

@Injectable()
export class CodeExecutionService {
  private readonly pistonApiUrl = 'https://emkc.org/api/v2/piston';

  // Mapeo de lenguajes a versiones de Piston
  private readonly languageMap: Record<string, { language: string; version: string }> = {
    javascript: { language: 'javascript', version: '18.15.0' },
    python: { language: 'python', version: '3.10.0' },
    java: { language: 'java', version: '15.0.2' },
    cpp: { language: 'cpp', version: '10.2.0' },
    c: { language: 'c', version: '10.2.0' },
    csharp: { language: 'csharp', version: '6.12.0' },
    php: { language: 'php', version: '8.2.3' },
    ruby: { language: 'ruby', version: '3.0.1' },
    go: { language: 'go', version: '1.16.2' },
    rust: { language: 'rust', version: '1.68.2' },
    typescript: { language: 'typescript', version: '5.0.3' },
  };

  async executeCode(
    codigo: string,
    lenguaje: string,
    stdin?: string,
    timeoutSeconds: number = 3,
  ): Promise<ExecutionResult> {
    try {
      const langConfig = this.languageMap[lenguaje.toLowerCase()];
      
      if (!langConfig) {
        throw new BadRequestException(
          `Lenguaje no soportado: ${lenguaje}. Lenguajes disponibles: ${Object.keys(this.languageMap).join(', ')}`,
        );
      }

      const startTime = Date.now();

      const response = await axios.post(
        `${this.pistonApiUrl}/execute`,
        {
          language: langConfig.language,
          version: langConfig.version,
          files: [
            {
              name: this.getFileName(lenguaje),
              content: codigo,
            },
          ],
          stdin: stdin || '',
          compile_timeout: timeoutSeconds * 1000,
          run_timeout: timeoutSeconds * 1000,
        },
        {
          timeout: (timeoutSeconds + 2) * 1000,
        },
      );

      const executionTime = Date.now() - startTime;

      return {
        stdout: response.data.run?.stdout || '',
        stderr: response.data.run?.stderr || response.data.compile?.stderr || '',
        exitCode: response.data.run?.code || 0,
        executionTime,
        error: response.data.run?.stderr || response.data.compile?.stderr || undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return {
            stdout: '',
            stderr: 'Error: Tiempo de ejecución excedido',
            exitCode: 124,
            executionTime: timeoutSeconds * 1000,
            error: 'Timeout exceeded',
          };
        }
        throw new BadRequestException(
          `Error al ejecutar código: ${error.message}`,
        );
      }

      throw new BadRequestException('Error desconocido al ejecutar código');
    }
  }

  async runTests(
    codigo: string,
    lenguaje: string,
    testCases: Array<{
      id: string;
      stdin: string | null;
      expected: string;
      timeoutSeconds: number;
    }>,
  ): Promise<{ results: TestResult[]; score: number; totalWeight: number }> {
    const results: TestResult[] = [];
    let totalWeight = 0;
    let earnedWeight = 0;

    for (const testCase of testCases) {
      const weight = 1; // Por defecto, si no se especifica peso
      totalWeight += weight;

      try {
        const execution = await this.executeCode(
          codigo,
          lenguaje,
          testCase.stdin || undefined,
          testCase.timeoutSeconds,
        );

        const got = execution.stdout.trim();
        const expected = testCase.expected.trim();
        const passed = got === expected;

        if (passed) {
          earnedWeight += weight;
        }

        results.push({
          testId: testCase.id,
          passed,
          expected,
          got,
          output: execution.stdout,
          time: execution.executionTime,
          error: execution.error,
        });
      } catch (error) {
        results.push({
          testId: testCase.id,
          passed: false,
          expected: testCase.expected,
          got: '',
          output: '',
          time: 0,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    const score = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;

    return { results, score, totalWeight };
  }

  private getFileName(lenguaje: string): string {
    const fileNames: Record<string, string> = {
      javascript: 'main.js',
      python: 'main.py',
      java: 'Main.java',
      cpp: 'main.cpp',
      c: 'main.c',
      csharp: 'Main.cs',
      php: 'main.php',
      ruby: 'main.rb',
      go: 'main.go',
      rust: 'main.rs',
      typescript: 'main.ts',
    };
    return fileNames[lenguaje.toLowerCase()] || 'main.txt';
  }
}
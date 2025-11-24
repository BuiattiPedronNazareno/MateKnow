"use client";
import { use, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { programmingService } from "@/app/services/programmingService";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Typography, Alert, Paper, CircularProgress, Divider, Chip } from "@mui/material";

export default function ProgrammingResolver({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ejercicioId = resolvedParams.id;
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    if (!ejercicioId) return;
    
    setLoadingTests(true);
    programmingService.getTests(ejercicioId)
      .then((r) => {
        setTests(Array.isArray(r) ? r : []);
      })
      .catch((err) => {
        console.error("Error loading tests:", err);
        setTests([]);
      })
      .finally(() => setLoadingTests(false));
  }, [ejercicioId]);

  const ejecutar = async () => {
    setLoading(true);
    try {
      const res = await programmingService.saveAttempt({
        ejercicioId,
        codigo: code,
        lenguaje: "python",
        runOnly: true,
      });

      setOutput(JSON.stringify(res, null, 2));
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!code.trim()) {
      alert("Escribe código antes de guardar");
      return;
    }
  
    setLoading(true);
    try {
      // 1. Guardar el intento de programación
      const res = await programmingService.saveAttempt({
        ejercicioId,
        codigo: code,
        lenguaje: "python",
        runOnly: false,
      });
  
      setOutput(JSON.stringify(res, null, 2));
  
      // 2. Si viene desde una actividad, guardar la respuesta en el intento
      if (returnTo) {
        try {
          const intentoId = sessionStorage.getItem('current_intento_id');
          const claseId = sessionStorage.getItem('current_clase_id');
          const currentStep = sessionStorage.getItem('current_step');
  
          if (intentoId && claseId) {
            const { actividadService } = await import('@/app/services/actividadService');
            
            await actividadService.guardarRespuesta(
              claseId,
              intentoId,
              ejercicioId,
              {
                codigo: code,
                attemptId: res.attempt?.id,
                score: res.score,
                lenguaje: "python"
              }
            );
            
            console.log('Respuesta guardada en la actividad');
            
            //  NUEVO: Avanzar al siguiente ejercicio
            if (currentStep !== null) {
              const nextStep = parseInt(currentStep) + 1;
              sessionStorage.setItem('current_step', String(nextStep));
              console.log('Avanzando al ejercicio:', nextStep + 1);
            }
          }
        } catch (err) {
          console.error('Error guardando respuesta en actividad:', err);
        }
  
        alert('Código guardado correctamente. Redirigiendo...');
        setTimeout(() => {
          router.push(returnTo);
        }, 1500);
      } else {
        alert('Intento guardado exitosamente');
      }
      
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', p: 3 }}>
      <Paper sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#3E2723' }}>
            Editor de Código
          </Typography>
          
          {returnTo && (
            <Button 
              variant="outlined" 
              onClick={() => router.push(returnTo)}
              sx={{ borderColor: '#8B4513', color: '#8B4513' }}
            >
              ← Volver a la actividad
            </Button>
          )}
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Escribe tu código en Python. Puedes ejecutarlo para probarlo o guardarlo como intento final.
        </Alert>

        <Box sx={{ mb: 2, border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
          <Editor
            height="400px"
            defaultLanguage="python"
            value={code}
            onChange={(v) => setCode(v || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button 
            variant="outlined" 
            onClick={ejecutar} 
            disabled={loading || !code.trim()}
            sx={{ flex: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Ejecutar (no guarda)'}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={guardar} 
            disabled={loading || !code.trim()}
            sx={{ 
              flex: 1,
              bgcolor: '#2E7D32',
              '&:hover': { bgcolor: '#1B5E20' }
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Guardar intento'}
          </Button>
        </Box>

        {output && (
          <Paper 
            sx={{ 
              p: 3, 
              bgcolor: '#1E1E1E', 
              borderRadius: 2,
              mb: 3
            }}
          >
            <Typography variant="h6" sx={{ color: '#4EC9B0', mb: 2 }}>
              Resultados de la Ejecución
            </Typography>
            
            {(() => {
              try {
                const result = JSON.parse(output);
                
                // Mostrar salida del programa
                if (result.runResult?.run) {
                  return (
                    <Box>
                      {/* Salida estándar */}
                      {result.runResult.run.stdout && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: '#9CDCFE', mb: 1 }}>
                            Salida del programa:
                          </Typography>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              bgcolor: '#0D1117', 
                              color: '#C9D1D9',
                              fontFamily: 'monospace',
                              fontSize: '0.95rem',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {result.runResult.run.stdout}
                          </Paper>
                        </Box>
                      )}
                      
                      {/* Errores */}
                      {result.runResult.run.stderr && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: '#F85149', mb: 1 }}>
                            Errores:
                          </Typography>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              bgcolor: '#2D0A0A', 
                              color: '#FFA198',
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {result.runResult.run.stderr}
                          </Paper>
                        </Box>
                      )}
                      
                      {/* Resultados de tests */}
                      {result.tests && result.tests.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: '#9CDCFE', mb: 1 }}>
                            Tests Automatizados:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {result.tests.map((test: any, idx: number) => (
                              <Paper
                                key={idx}
                                sx={{
                                  p: 2,
                                  bgcolor: test.passed ? '#0D3A0D' : '#3A0D0D',
                                  border: `1px solid ${test.passed ? '#2EA043' : '#F85149'}`,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: test.passed ? '#3FB950' : '#F85149',
                                      fontWeight: 600,
                                      mb: 0.5
                                    }}
                                  >
                                    {test.passed ? 'Test Pasado' : 'Test Fallado'}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ color: '#8B949E', fontFamily: 'monospace' }}
                                  >
                                    Esperado: "{test.expected?.trim()}" | Obtenido: "{test.got?.trim()}"
                                  </Typography>
                                  {/*  MOSTRAR PESO */}
                                  <Typography 
                                    variant="caption" 
                                    sx={{ color: '#8B949E', display: 'block', mt: 0.5 }}
                                  >
                                    Peso: {test.weight || 1} punto{(test.weight || 1) !== 1 ? 's' : ''}
                                  </Typography>
                                </Box>
                                <Chip 
                                  label={test.passed ? 'PASS' : 'FAIL'}
                                  size="small"
                                  sx={{
                                    bgcolor: test.passed ? '#2EA043' : '#F85149',
                                    color: 'white',
                                    fontWeight: 'bold'
                                  }}
                                />
                              </Paper>
                            ))}
                          </Box>
                          
                          {/*  Score total CON PUNTAJE REAL */}
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#0D1117', borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: result.score === 100 ? '#3FB950' : '#FFA657', fontWeight: 700 }}>
                              {result.puntajeObtenido || 0} / {result.puntajeMaximo || 0} puntos
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#8B949E' }}>
                              {result.score}% completado
                            </Typography>
                          </Box>
                        </Box>
                      )}

                    </Box>
                  );
                }
                
                // Fallback: mostrar JSON crudo si no tiene la estructura esperada
                return (
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    color: '#D4D4D4',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem' 
                  }}>
                    {output}
                  </pre>
                );
                
              } catch (e) {
                // Si no es JSON válido, mostrar texto plano
                return (
                  <Typography sx={{ color: '#F85149', fontFamily: 'monospace' }}>
                    {output}
                  </Typography>
                );
              }
            })()}
          </Paper>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2, color: '#3E2723' }}>
          Tests Automatizados
        </Typography>

        {loadingTests ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : tests.length === 0 ? (
          <Alert severity="warning">
            No hay tests definidos para este ejercicio
          </Alert>
        ) : (
          <Box component="ul" sx={{ pl: 3 }}>
            {tests.map((t: any, i: number) => (
              <Box 
                component="li" 
                key={i}
                sx={{ 
                  mb: 1, 
                  p: 1, 
                  bgcolor: '#f5f5f5', 
                  borderRadius: 1,
                  listStyle: 'none'
                }}
              >
                <Typography variant="body2">
                  <strong>Test {i + 1}:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Entrada: "{t.stdin || '(vacío)'}" → Salida esperada: "{t.expected}"
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
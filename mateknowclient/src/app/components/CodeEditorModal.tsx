'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Chip,
  Collapse,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import {
  PlayArrow,
  Close,
  CheckCircle,
  Cancel,
  Terminal,
  Code as CodeIcon,
  Refresh,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { programmingService } from '@/app/services/programmingService';

interface CodeEditorModalProps {
  open: boolean;
  onClose: () => void;
  ejercicio: any;
  initialCode?: string;
  onSuccess?: (score: number, resultado: any) => void;
}

export default function CodeEditorModal({
  open,
  onClose,
  ejercicio,
  initialCode,
  onSuccess,
}: CodeEditorModalProps) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [code, setCode] = useState(initialCode || '');
  const [lenguaje, setLenguaje] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [tabValue, setTabValue] = useState(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [expandedTests, setExpandedTests] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (open) {
      if (ejercicio?.metadata?.boilerplate && !code) {
        setCode(ejercicio.metadata.boilerplate);
      }
      if (ejercicio?.metadata?.lenguaje) {
        setLenguaje(ejercicio.metadata.lenguaje.toLowerCase());
      }
      setExecutionResult(null);
      setErrorMsg('');
      setExpandedTests({});
      setTabValue(0);
    }
  }, [open, ejercicio]);

  // Configuración del tema grisáceo para el editor
  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('ide-light-gray', {
      base: 'vs', 
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#EEEEEE', 
      },
    });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setErrorMsg('');
    setExecutionResult(null);
    setExpandedTests({});
    
    if (isSmallScreen) {
      setTabValue(1);
    }

    try {
      const res = await programmingService.saveAttempt({
        ejercicioId: ejercicio.id,
        codigo: code,
        lenguaje: lenguaje,
        runOnly: true,
      });

      setExecutionResult(res);
      
      if (res.tests) {
        const newExpanded: any = {};
        res.tests.forEach((t: any, idx: number) => {
          if (!t.passed) newExpanded[idx] = true;
        });
        setExpandedTests(newExpanded);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocurrió un error al ejecutar el código. Verifique su conexión o intente nuevamente.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const res = await programmingService.saveAttempt({
        ejercicioId: ejercicio.id,
        codigo: code,
        lenguaje: lenguaje,
        runOnly: false, 
      });

      setConfirmSubmitOpen(false);
      
      if (onSuccess) {
        onSuccess(res.score || 0, res);
      }
      
      onClose();
    } catch (err: any) {
      setErrorMsg('Error al guardar el intento: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleTestExpand = (idx: number) => {
    setExpandedTests(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderTestResults = () => {
    if (!executionResult || !executionResult.tests) return null;

    // Cálculo de puntos
    const totalPuntos = ejercicio.puntos || 0;
    const scorePercent = executionResult.score || 0;
    const puntosObtenidos = (scorePercent / 100) * totalPuntos;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#5D4037' }}>
          Resultados de los Casos de Prueba:
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {executionResult.tests.map((test: any, idx: number) => {
            const isExpanded = expandedTests[idx];
            const borderColor = test.passed ? '#66BB6A' : '#EF5350';
            const bgColor = test.passed ? '#F1F8E9' : '#FFEBEE';

            return (
              <Paper 
                key={idx} 
                variant="outlined" 
                sx={{ 
                  overflow: 'hidden', 
                  borderColor: borderColor,
                  borderLeftWidth: '6px'
                }}
              >
                <Box 
                  onClick={() => toggleTestExpand(idx)}
                  sx={{ 
                    p: 1.5, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    bgcolor: bgColor,
                    cursor: 'pointer'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {test.passed ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <Cancel color="error" fontSize="small" />
                    )}
                    <Typography variant="body2" fontWeight="bold" color={test.passed ? 'success.dark' : 'error.dark'}>
                      Caso de Prueba {idx + 1}
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    {isExpanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                  </IconButton>
                </Box>

                <Collapse in={isExpanded}>
                  <Box sx={{ p: 2, bgcolor: '#fff' }}>
                    {test.stdin && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">ENTRADA:</Typography>
                        <Paper variant="outlined" sx={{ p: 1, bgcolor: '#FAFAFA', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                          {test.stdin}
                        </Paper>
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">SALIDA ESPERADA:</Typography>
                      <Paper variant="outlined" sx={{ p: 1, bgcolor: '#F5F5F5', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', border: '1px dashed #ccc' }}>
                        {test.expected || '(Vacío)'}
                      </Paper>
                    </Box>

                    <Box sx={{ mb: test.stderr ? 2 : 0 }}>
                      <Typography variant="caption" color={test.passed ? "success.main" : "error.main"} fontWeight="bold">
                        SALIDA OBTENIDA:
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1, 
                          bgcolor: test.passed ? '#F1F8E9' : '#FFEBEE', 
                          fontFamily: 'monospace', 
                          fontSize: '0.8rem', 
                          whiteSpace: 'pre-wrap',
                          borderColor: test.passed ? 'success.light' : 'error.light'
                        }}
                      >
                        {test.got || '(Vacío)'}
                      </Paper>
                    </Box>

                    {test.stderr && (
                      <Box>
                        <Typography variant="caption" color="error" fontWeight="bold">ERROR DE EJECUCIÓN:</Typography>
                        <Paper variant="outlined" sx={{ p: 1, bgcolor: '#FFEBEE', color: '#C62828', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                          {test.stderr}
                        </Paper>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
        
        {/* Resumen de Puntaje */}
        <Box sx={{ mt: 3, p: 2, bgcolor: '#FFF8E1', borderRadius: 1, border: '1px solid #FFE0B2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="#5D4037">
              Resultado de ejecución:
            </Typography>
            {/* ✅ Muestra los puntos exactos obtenidos */}
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
              Obtuviste {puntosObtenidos.toFixed(2)} de {totalPuntos} pts
            </Typography>
          </Box>
          <Typography variant="h6" color="#E65100" fontWeight="bold">
            {scorePercent.toFixed(0)}%
          </Typography>
        </Box>
      </Box>
    );
  };

  // --- PANELES ---

  const EditorPanel = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      flex: 1, 
      height: '100%',
      borderRight: { md: '1px solid #e0e0e0' },
      minHeight: 0,
      overflow: 'hidden'
    }}>
      <Box sx={{ p: 1, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Escribe tu solución aquí.
        </Typography>
        <Button 
          size="small" 
          startIcon={<Refresh />} 
          onClick={() => setCode(ejercicio.metadata?.boilerplate || '')}
          sx={{ color: '#5D4037' }}
        >
          Reiniciar
        </Button>
      </Box>
      
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Editor
            height="100%"
            defaultLanguage={lenguaje === 'c++' ? 'cpp' : lenguaje}
            language={lenguaje === 'c++' ? 'cpp' : lenguaje}
            value={code}
            onChange={(val) => setCode(val || '')}
            theme="ide-light-gray"
            beforeMount={handleEditorWillMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
      </Box>
    </Box>
  );

  const ConsolePanel = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      width: { md: '40%', xs: '100%' },
      height: '100%',
      bgcolor: '#f9f9f9',
      minHeight: 0,
      overflowY: 'hidden'
    }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Terminal fontSize="small" color="action" />
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#3E2723' }}>
          Consola de Salida
        </Typography>
      </Box>

      <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
        )}

        {isRunning && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
            <CircularProgress size={30} sx={{ color: '#8B4513', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Ejecutando código...
            </Typography>
          </Box>
        )}

        {!isRunning && executionResult && (
          <Box>
            {executionResult.runResult?.run?.stdout && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff', mb: 2, borderLeft: '4px solid #8B4513' }}>
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5 }}>
                  SALIDA (STDOUT):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', m: 0, whiteSpace: 'pre-wrap', color: '#212121' }}>
                  {executionResult.runResult.run.stdout}
                </Typography>
              </Paper>
            )}

            {executionResult.runResult?.run?.stderr && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FFEBEE', mb: 2, borderLeft: '4px solid #D32F2F' }}>
                <Typography variant="caption" display="block" color="error" fontWeight="bold" sx={{ mb: 0.5 }}>
                  ERROR (STDERR):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', m: 0, whiteSpace: 'pre-wrap', color: '#B71C1C' }}>
                  {executionResult.runResult.run.stderr}
                </Typography>
              </Paper>
            )}

            <Divider sx={{ mb: 2 }} />
            
            {renderTestResults()}
          </Box>
        )}

        {!isRunning && !executionResult && !errorMsg && (
          <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
            <Typography variant="body2" color="text.secondary">
              Presiona "Probar Código" para ejecutar.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xl"
        disableEscapeKeyDown
        scroll="paper"
        PaperProps={{
          sx: { 
            height: '90vh', 
            maxHeight: '90vh',
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 2 
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid #e0e0e0', color: '#3E2723', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon />
            <Typography variant="h6" fontWeight="bold">
              Editor de Código
            </Typography>
            <Chip 
              label={lenguaje.toUpperCase()} 
              size="small" 
              sx={{ bgcolor: '#8B4513', color: 'white', ml: 2, fontWeight: 'bold' }} 
            />
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#5D4037' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ 
          p: 0, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {isSmallScreen ? (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa', flexShrink: 0 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={(e, v) => setTabValue(v)} 
                  variant="fullWidth" 
                  indicatorColor="primary"
                  textColor="primary"
                  sx={{ 
                    '& .MuiTab-root': { fontWeight: 'bold', color: '#5D4037' }, 
                    '& .Mui-selected': { color: '#E65100' }, 
                    '& .MuiTabs-indicator': { bgcolor: '#E65100' } 
                  }}
                >
                  <Tab icon={<CodeIcon />} label="Editor" iconPosition="start" />
                  <Tab icon={<Terminal />} label="Consola" iconPosition="start" />
                </Tabs>
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {tabValue === 0 ? EditorPanel : ConsolePanel}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
              {EditorPanel}
              {ConsolePanel}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Button onClick={onClose} sx={{ color: '#5D4037' }}>
            Cerrar
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrow />}
            sx={{ 
              color: '#8B4513', 
              borderColor: '#8B4513',
              '&:hover': { borderColor: '#5D4037', bgcolor: 'rgba(139, 69, 19, 0.04)' } 
            }}
          >
            {isRunning ? 'Ejecutando...' : 'Probar Código'}
          </Button>

          <Button 
            variant="contained" 
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={isRunning || !code.trim() || !executionResult}
            sx={{ 
              bgcolor: '#2E7D32', 
              color: 'white',
              '&:hover': { bgcolor: '#1B5E20' }
            }}
          >
            Entregar Solución
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmSubmitOpen} onClose={() => setConfirmSubmitOpen(false)}>
        <DialogTitle>Confirmar Entrega</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de enviar esta solución? Se guardará el puntaje obtenido.
          </Typography>
          {executionResult && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Puntaje estimado: <strong>{executionResult.score ? executionResult.score.toFixed(0) : 0}%</strong>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={submitLoading}>
            {submitLoading ? 'Enviando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
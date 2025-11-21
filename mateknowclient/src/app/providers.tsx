// src/app/providers.tsx
'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { mateTheme } from '../theme/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={mateTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
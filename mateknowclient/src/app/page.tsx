'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from './services/authService';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = authService.getUser();
    
    if (!user) {
      // Si no hay usuario logueado, redirigir al login
      router.replace('/login');
    } else {
      // Si hay usuario logueado, redirigir a clases
      router.replace('/dashboard');
    }
  }, [router]);
}

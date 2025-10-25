import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private supabaseServiceRoleKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL')!;
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY')!;
    this.supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
      throw new Error('Faltan variables de entorno de Supabase en .env');
    }

    console.log('Servicio de Supabase inicializado correctamente');
  }

 
  getClient(accessToken?: string): SupabaseClient {
    const client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });
    return client;
  }

  
  getAdminClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
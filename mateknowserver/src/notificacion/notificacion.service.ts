import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';

@Injectable()
export class NotificacionService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Crear notificación para un solo usuario
  async notificarUsuario(userId: string, titulo: string, contenido: string, link: string) {
    const supabase = this.supabaseService.getAdminClient();
    await supabase.from('notificacion').insert({
      usuario_id: userId,
      titulo,
      contenido,
      link
    });
  }

  async notificarClase(claseId: string, titulo: string, contenido: string, link: string, excludeUserId?: string) {
    console.log(`🔍 [DEBUG] Iniciando notificación clase ${claseId} (Excluyendo a: ${excludeUserId})`);
    const supabase = this.supabaseService.getAdminClient();
    
    // Obtener alumnos
    const { data: inscripciones, error } = await supabase
      .from('inscripcion')
      .select('usuario_id')
      .eq('clase_id', claseId);

    if (error || !inscripciones) return;

    // 2. FILTRAR: Quitamos al usuario que creó el anuncio
    const targets = inscripciones
      .map(i => i.usuario_id)
      .filter(uid => uid !== excludeUserId);

    if (targets.length === 0) return;

    const notificaciones = targets.map((uid) => ({
      usuario_id: uid,
      titulo,
      contenido,
      link,
    }));

    await supabase.from('notificacion').insert(notificaciones);
    console.log(`Notificaciones enviadas a ${targets.length} usuarios.`);
  }

  // 3. Nuevo método para marcar todo como leído
  async marcarTodasComoLeidas(userId: string) {
    const supabase = this.supabaseService.getAdminClient();
    await supabase
      .from('notificacion')
      .update({ leida: true })
      .eq('usuario_id', userId)
      .eq('leida', false); // Solo actualizamos las que faltan
    
    return { message: 'Todas marcadas como leídas' };
  }

  async obtenerMisNotificaciones(userId: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('notificacion')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
      .limit(20); // Limitar a las ultimas 20

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async marcarComoLeida(notificacionId: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();
    await supabase
      .from('notificacion')
      .update({ leida: true })
      .eq('id', notificacionId)
      .eq('usuario_id', userId);
    
    return { message: 'Leída' };
  }

  async eliminarTodas(userId: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('notificacion')
      .delete()
      .eq('usuario_id', userId);
    
    if (error) throw new InternalServerErrorException(error.message);
    return { message: 'Notificaciones eliminadas' };
  }
}
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebhookService } from './services/webhook.service';
import { Webhook } from './interface/webhook.interface';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Subject, takeUntil } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'worky-webhooks',
  templateUrl: './webhooks.component.html',
  styleUrls: ['./webhooks.component.scss'],
  standalone: false
})
export class WebhooksComponent implements OnInit, OnDestroy {

  webhookForm: FormGroup;
  webhooks: Webhook[] = [];
  isLoading = true;
  loadWebhookButtons = false;
  editingWebhook: Webhook | null = null;

  availableEvents = [
    // User events
    { value: 'user_registered', label: 'Usuario Registrado', description: 'Se activa cuando un usuario se registra.' },
    { value: 'user_login', label: 'Usuario Inició Sesión', description: 'Se activa cuando un usuario inicia sesión.' },
    { value: 'user_edited', label: 'Usuario Editado', description: 'Se activa cuando un usuario edita su perfil.' },
    { value: 'user_deleted', label: 'Usuario Eliminado', description: 'Se activa cuando un usuario es eliminado.' },
    { value: 'user_email_verified', label: 'Email Verificado', description: 'Se activa cuando un usuario verifica su email.' },
    { value: 'user_password_reset', label: 'Password Reseteado', description: 'Se activa cuando un usuario resetea su contraseña.' },
    { value: 'user_profile_updated', label: 'Perfil Actualizado', description: 'Se activa cuando un usuario actualiza su perfil.' },
    { value: 'user_avatar_updated', label: 'Avatar Actualizado', description: 'Se activa cuando un usuario actualiza su avatar.' },
    { value: 'user_device_registered', label: 'Dispositivo Registrado', description: 'Se activa cuando un usuario registra un nuevo dispositivo.' },

    // Publication events
    { value: 'publication_created', label: 'Publicación Creada', description: 'Se activa cuando se crea una publicación.' },
    { value: 'publication_edited', label: 'Publicación Editada', description: 'Se activa cuando se edita una publicación.' },
    { value: 'publication_deleted', label: 'Publicación Eliminada', description: 'Se activa cuando se elimina una publicación.' },
    { value: 'publication_liked', label: 'Publicación Likeada', description: 'Se activa cuando se da like a una publicación.' },
    { value: 'publication_unliked', label: 'Publicación Dislikeada', description: 'Se activa cuando se quita el like de una publicación.' },
    { value: 'publication_commented', label: 'Comentario en Publicación', description: 'Se activa cuando se comenta una publicación.' },
    { value: 'publication_comment_deleted', label: 'Comentario Eliminado de Publicación', description: 'Se activa cuando se elimina un comentario de una publicación.' },
    { value: 'publication_comment_liked', label: 'Comentario de Publicación Likeado', description: 'Se activa cuando se da like a un comentario de publicación.' },
    { value: 'publication_comment_unliked', label: 'Comentario de Publicación Dislikeado', description: 'Se activa cuando se quita el like de un comentario de publicación.' },

    // Comment events
    { value: 'comment_created', label: 'Comentario Creado', description: 'Se activa cuando se crea un comentario.' },
    { value: 'comment_edited', label: 'Comentario Editado', description: 'Se activa cuando se edita un comentario.' },
    { value: 'comment_deleted', label: 'Comentario Eliminado', description: 'Se activa cuando se elimina un comentario.' },
    { value: 'comment_liked', label: 'Comentario Likeado', description: 'Se activa cuando se da like a un comentario.' },
    { value: 'comment_unliked', label: 'Comentario Dislikeado', description: 'Se activa cuando se quita el like de un comentario.' },

    // Reaction events
    { value: 'reaction_created', label: 'Reacción Creada', description: 'Se activa cuando se crea una reacción.' },
    { value: 'reaction_updated', label: 'Reacción Actualizada', description: 'Se activa cuando se actualiza una reacción.' },
    { value: 'reaction_deleted', label: 'Reacción Eliminada', description: 'Se activa cuando se elimina una reacción.' },

    // Friend events
    { value: 'friend_request_sent', label: 'Solicitud de Amistad Enviada', description: 'Se activa cuando se envía una solicitud de amistad.' },
    { value: 'friend_request_accepted', label: 'Solicitud de Amistad Aceptada', description: 'Se activa cuando se acepta una solicitud de amistad.' },
    { value: 'friend_request_rejected', label: 'Solicitud de Amistad Rechazada', description: 'Se activa cuando se rechaza una solicitud de amistad.' },
    { value: 'friend_removed', label: 'Amigo Eliminado', description: 'Se activa cuando se elimina un amigo.' },
    { value: 'user_blocked', label: 'Usuario Bloqueado', description: 'Se activa cuando se bloquea un usuario.' },
    { value: 'user_unblocked', label: 'Usuario Desbloqueado', description: 'Se activa cuando se desbloquea un usuario.' },

    // Mail events
    { value: 'email_sent', label: 'Email Enviado', description: 'Se activa cuando se envía un email.' },
    { value: 'email_failed', label: 'Fallo de Email', description: 'Se activa cuando falla el envío de un email.' },
    { value: 'welcome_email_sent', label: 'Email de Bienvenida Enviado', description: 'Se activa cuando se envía un email de bienvenida.' },
    { value: 'password_reset_email_sent', label: 'Email de Reseteo de Contraseña Enviado', description: 'Se activa cuando se envía un email de reseteo de contraseña.' },
    { value: 'verification_email_sent', label: 'Email de Verificación Enviado', description: 'Se activa cuando se envía un email de verificación.' },

    // Report events
    { value: 'report_created', label: 'Reporte Creado', description: 'Se activa cuando se crea un reporte.' },
    { value: 'report_updated', label: 'Reporte Actualizado', description: 'Se activa cuando se actualiza un reporte.' },
    { value: 'report_resolved', label: 'Reporte Resuelto', description: 'Se activa cuando se resuelve un reporte.' },

    // Invitation events
    { value: 'invitation_code_created', label: 'Código de Invitación Creado', description: 'Se activa cuando se crea un código de invitación.' },
    { value: 'invitation_code_used', label: 'Código de Invitación Usado', description: 'Se activa cuando se usa un código de invitación.' },
    { value: 'invitation_code_expired', label: 'Código de Invitación Expirado', description: 'Se activa cuando expira un código de invitación.' },

    // System events
    { value: 'system_maintenance', label: 'Mantenimiento del Sistema', description: 'Se activa cuando el sistema entra en mantenimiento.' },
    { value: 'system_error', label: 'Error del Sistema', description: 'Se activa cuando ocurre un error en el sistema.' },
    { value: 'log_cleanup', label: 'Limpieza de Logs', description: 'Se activa cuando se realiza una limpieza de logs.' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private webhookService: WebhookService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private _logService: LogService
  ) {
    this.webhookForm = this.fb.group({
      event: ['', Validators.required],
      url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    });
  }

  ngOnInit(): void {
    this.loadWebhooks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWebhooks() {
    this.isLoading = true;
    this.webhookService.getAllWebhooks().pipe(takeUntil(this.destroy$)).subscribe({
      next: (webhooks) => {
        this.webhooks = webhooks;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WebhooksComponent',
          'Error loading webhooks',
          { error: String(error) }
        );
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveWebhook() {
    if (this.webhookForm.invalid) return;
    this.loadWebhookButtons = true;
    const data = this.webhookForm.value;

    if (this.editingWebhook) {
      this.webhookService.editWebhook(this.editingWebhook._id, data).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.alertService.showAlert('Éxito', 'Webhook actualizado correctamente', Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
          this.webhookForm.reset();
          this.editingWebhook = null;
          this.loadWebhooks();
          this.loadWebhookButtons = false;
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'WebhooksComponent',
            'Error updating webhook',
            { error: String(error), webhookId: this.editingWebhook?._id }
          );
          this.alertService.showAlert('Error', 'No se pudo actualizar el webhook', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
          this.loadWebhookButtons = false;
        }
      });
    } else {
      this.webhookService.registerWebhook(data).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.alertService.showAlert('Éxito', 'Webhook creado correctamente', Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
          this.webhookForm.reset();
          this.loadWebhooks();
          this.loadWebhookButtons = false;
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'WebhooksComponent',
            'Error creating webhook',
            { error: String(error), webhookData: data }
          );
          this.alertService.showAlert('Error', 'No se pudo crear el webhook', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
          this.loadWebhookButtons = false;
        }
      });
    }
  }

  editWebhook(webhook: Webhook) {
    this.editingWebhook = webhook;
    this.webhookForm.patchValue({
      event: webhook.event,
      url: webhook.url,
    });
    this.cdr.markForCheck();
  }

  cancelEdit() {
    this.editingWebhook = null;
    this.webhookForm.reset();
  }

  deleteWebhook(id: string) {
    this.webhookService.deleteWebhook(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.alertService.showAlert('Éxito', 'Webhook eliminado correctamente', Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
        this.loadWebhooks();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WebhooksComponent',
          'Error deleting webhook',
          { error: String(error), webhookId: id }
        );
        this.alertService.showAlert('Error', 'No se pudo eliminar el webhook', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
      }
    });
  }

  toggleWebhookStatus(webhook: Webhook) {
    this.webhookService.toggleWebhook(webhook._id, { isActive: !webhook.isActive }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.alertService.showAlert('Éxito', `Webhook ${webhook.isActive ? 'desactivado' : 'activado'} correctamente`, Alerts.SUCCESS, Position.CENTER, true, 'Aceptar');
        this.loadWebhooks();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WebhooksComponent',
          'Error toggling webhook status',
          { error: String(error), webhookId: webhook._id, newStatus: !webhook.isActive }
        );
        this.alertService.showAlert('Error', 'No se pudo cambiar el estado del webhook', Alerts.ERROR, Position.CENTER, true, 'Aceptar');
      }
    });
  }

  getEventLabel(event: string): string {
    return this.availableEvents.find(e => e.value === event)?.label || event;
  }

  trackByWebhook(index: number, webhook: Webhook): string {
    return webhook._id;
  }
}

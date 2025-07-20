import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebhookService } from './services/webhook.service';
import { Webhook } from './interface/webhook.interface';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { AlertService } from '@shared/services/alert.service';
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
    { value: 'user_registered', label: 'Usuario Registrado', description: 'Se activa cuando un usuario se registra.' },
    { value: 'user_login', label: 'Usuario Inició Sesión', description: 'Se activa cuando un usuario inicia sesión.' },
    { value: 'user_edited', label: 'Usuario Editado', description: 'Se activa cuando un usuario edita su perfil.' },
    { value: 'user_deleted', label: 'Usuario Eliminado', description: 'Se activa cuando un usuario es eliminado.' },
    { value: 'user_email_verified', label: 'Email Verificado', description: 'Se activa cuando un usuario verifica su email.' },
    { value: 'user_password_reset', label: 'Password Reseteado', description: 'Se activa cuando un usuario resetea su contraseña.' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private webhookService: WebhookService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
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
        console.error('Error loading webhooks:', error);
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
        error: () => {
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
        error: () => {
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
      error: () => {
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
      error: () => {
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

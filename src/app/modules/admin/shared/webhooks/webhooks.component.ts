import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebhookService } from './services/webhook.service';
import { Webhook } from './interface/webhook.interface';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Subject, takeUntil } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { translations } from '@translations/translations';

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
    { value: 'user_registered', label: translations['admin.webhooks.events.user_registered'], description: translations['admin.webhooks.events.user_registered.description'] },
    { value: 'user_login', label: translations['admin.webhooks.events.user_login'], description: translations['admin.webhooks.events.user_login.description'] },
    { value: 'user_edited', label: translations['admin.webhooks.events.user_edited'], description: translations['admin.webhooks.events.user_edited.description'] },
    { value: 'user_deleted', label: translations['admin.webhooks.events.user_deleted'], description: translations['admin.webhooks.events.user_deleted.description'] },
    { value: 'user_email_verified', label: translations['admin.webhooks.events.user_email_verified'], description: translations['admin.webhooks.events.user_email_verified.description'] },
    { value: 'user_password_reset', label: translations['admin.webhooks.events.user_password_reset'], description: translations['admin.webhooks.events.user_password_reset.description'] },
    { value: 'user_profile_updated', label: translations['admin.webhooks.events.user_profile_updated'], description: translations['admin.webhooks.events.user_profile_updated.description'] },
    { value: 'user_avatar_updated', label: translations['admin.webhooks.events.user_avatar_updated'], description: translations['admin.webhooks.events.user_avatar_updated.description'] },
    { value: 'user_device_registered', label: translations['admin.webhooks.events.user_device_registered'], description: translations['admin.webhooks.events.user_device_registered.description'] },

    // Publication events
    { value: 'publication_created', label: translations['admin.webhooks.events.publication_created'], description: translations['admin.webhooks.events.publication_created.description'] },
    { value: 'publication_edited', label: translations['admin.webhooks.events.publication_edited'], description: translations['admin.webhooks.events.publication_edited.description'] },
    { value: 'publication_deleted', label: translations['admin.webhooks.events.publication_deleted'], description: translations['admin.webhooks.events.publication_deleted.description'] },
    { value: 'publication_liked', label: translations['admin.webhooks.events.publication_liked'], description: translations['admin.webhooks.events.publication_liked.description'] },
    { value: 'publication_unliked', label: translations['admin.webhooks.events.publication_unliked'], description: translations['admin.webhooks.events.publication_unliked.description'] },
    { value: 'publication_commented', label: translations['admin.webhooks.events.publication_commented'], description: translations['admin.webhooks.events.publication_commented.description'] },
    { value: 'publication_comment_deleted', label: translations['admin.webhooks.events.publication_comment_deleted'], description: translations['admin.webhooks.events.publication_comment_deleted.description'] },
    { value: 'publication_comment_liked', label: translations['admin.webhooks.events.publication_comment_liked'], description: translations['admin.webhooks.events.publication_comment_liked.description'] },
    { value: 'publication_comment_unliked', label: translations['admin.webhooks.events.publication_comment_unliked'], description: translations['admin.webhooks.events.publication_comment_unliked.description'] },

    // Comment events
    { value: 'comment_created', label: translations['admin.webhooks.events.comment_created'], description: translations['admin.webhooks.events.comment_created.description'] },
    { value: 'comment_edited', label: translations['admin.webhooks.events.comment_edited'], description: translations['admin.webhooks.events.comment_edited.description'] },
    { value: 'comment_deleted', label: translations['admin.webhooks.events.comment_deleted'], description: translations['admin.webhooks.events.comment_deleted.description'] },
    { value: 'comment_liked', label: translations['admin.webhooks.events.comment_liked'], description: translations['admin.webhooks.events.comment_liked.description'] },
    { value: 'comment_unliked', label: translations['admin.webhooks.events.comment_unliked'], description: translations['admin.webhooks.events.comment_unliked.description'] },

    // Reaction events
    { value: 'reaction_created', label: translations['admin.webhooks.events.reaction_created'], description: translations['admin.webhooks.events.reaction_created.description'] },
    { value: 'reaction_updated', label: translations['admin.webhooks.events.reaction_updated'], description: translations['admin.webhooks.events.reaction_updated.description'] },
    { value: 'reaction_deleted', label: translations['admin.webhooks.events.reaction_deleted'], description: translations['admin.webhooks.events.reaction_deleted.description'] },

    // Friend events
    { value: 'friend_request_sent', label: translations['admin.webhooks.events.friend_request_sent'], description: translations['admin.webhooks.events.friend_request_sent.description'] },
    { value: 'friend_request_accepted', label: translations['admin.webhooks.events.friend_request_accepted'], description: translations['admin.webhooks.events.friend_request_accepted.description'] },
    { value: 'friend_request_rejected', label: translations['admin.webhooks.events.friend_request_rejected'], description: translations['admin.webhooks.events.friend_request_rejected.description'] },
    { value: 'friend_removed', label: translations['admin.webhooks.events.friend_removed'], description: translations['admin.webhooks.events.friend_removed.description'] },
    { value: 'user_blocked', label: translations['admin.webhooks.events.user_blocked'], description: translations['admin.webhooks.events.user_blocked.description'] },
    { value: 'user_unblocked', label: translations['admin.webhooks.events.user_unblocked'], description: translations['admin.webhooks.events.user_unblocked.description'] },

    // Mail events
    { value: 'email_sent', label: translations['admin.webhooks.events.email_sent'], description: translations['admin.webhooks.events.email_sent.description'] },
    { value: 'email_failed', label: translations['admin.webhooks.events.email_failed'], description: translations['admin.webhooks.events.email_failed.description'] },
    { value: 'welcome_email_sent', label: translations['admin.webhooks.events.welcome_email_sent'], description: translations['admin.webhooks.events.welcome_email_sent.description'] },
    { value: 'password_reset_email_sent', label: translations['admin.webhooks.events.password_reset_email_sent'], description: translations['admin.webhooks.events.password_reset_email_sent.description'] },
    { value: 'verification_email_sent', label: translations['admin.webhooks.events.verification_email_sent'], description: translations['admin.webhooks.events.verification_email_sent.description'] },

    // Report events
    { value: 'report_created', label: translations['admin.webhooks.events.report_created'], description: translations['admin.webhooks.events.report_created.description'] },
    { value: 'report_updated', label: translations['admin.webhooks.events.report_updated'], description: translations['admin.webhooks.events.report_updated.description'] },
    { value: 'report_resolved', label: translations['admin.webhooks.events.report_resolved'], description: translations['admin.webhooks.events.report_resolved.description'] },

    // Invitation events
    { value: 'invitation_code_created', label: translations['admin.webhooks.events.invitation_code_created'], description: translations['admin.webhooks.events.invitation_code_created.description'] },
    { value: 'invitation_code_used', label: translations['admin.webhooks.events.invitation_code_used'], description: translations['admin.webhooks.events.invitation_code_used.description'] },
    { value: 'invitation_code_expired', label: translations['admin.webhooks.events.invitation_code_expired'], description: translations['admin.webhooks.events.invitation_code_expired.description'] },

    // System events
    { value: 'system_maintenance', label: translations['admin.webhooks.events.system_maintenance'], description: translations['admin.webhooks.events.system_maintenance.description'] },
    { value: 'system_error', label: translations['admin.webhooks.events.system_error'], description: translations['admin.webhooks.events.system_error.description'] },
    { value: 'log_cleanup', label: translations['admin.webhooks.events.log_cleanup'], description: translations['admin.webhooks.events.log_cleanup.description'] },
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
          this.alertService.showAlert(translations['alert.success'], translations['admin.webhooks.messages.success.updated'], Alerts.SUCCESS, Position.CENTER, true, translations['button.ok']);
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
          this.alertService.showAlert(translations['alert.error'], translations['admin.webhooks.messages.error.update'], Alerts.ERROR, Position.CENTER, true, translations['button.ok']);
          this.loadWebhookButtons = false;
        }
      });
    } else {
      this.webhookService.registerWebhook(data).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.alertService.showAlert(translations['alert.success'], translations['admin.webhooks.messages.success.created'], Alerts.SUCCESS, Position.CENTER, true, translations['button.ok']);
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
          this.alertService.showAlert(translations['alert.error'], translations['admin.webhooks.messages.error.create'], Alerts.ERROR, Position.CENTER, true, translations['button.ok']);
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
        this.alertService.showAlert(translations['alert.success'], translations['admin.webhooks.messages.success.deleted'], Alerts.SUCCESS, Position.CENTER, true, translations['button.ok']);
        this.loadWebhooks();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WebhooksComponent',
          'Error deleting webhook',
          { error: String(error), webhookId: id }
        );
        this.alertService.showAlert(translations['alert.error'], translations['admin.webhooks.messages.error.delete'], Alerts.ERROR, Position.CENTER, true, translations['button.ok']);
      }
    });
  }

  toggleWebhookStatus(webhook: Webhook) {
    this.webhookService.toggleWebhook(webhook._id, { isActive: !webhook.isActive }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.alertService.showAlert(translations['alert.success'], webhook.isActive ? translations['admin.webhooks.messages.success.deactivated'] : translations['admin.webhooks.messages.success.activated'], Alerts.SUCCESS, Position.CENTER, true, translations['button.ok']);
        this.loadWebhooks();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'WebhooksComponent',
          'Error toggling webhook status',
          { error: String(error), webhookId: webhook._id, newStatus: !webhook.isActive }
        );
        this.alertService.showAlert(translations['alert.error'], translations['admin.webhooks.messages.error.toggle'], Alerts.ERROR, Position.CENTER, true, translations['button.ok']);
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

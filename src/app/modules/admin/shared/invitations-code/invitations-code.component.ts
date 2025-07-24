import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { InvitationsCodeService } from './services/invitations-code.service';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { InvitationsCodeList } from './interface/invitations-code.interface';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { environment } from '@env/environment';
import { translations } from '@translations/translations';

@Component({
    selector: 'worky-invitations-code',
    templateUrl: './invitations-code.component.html',
    styleUrls: ['./invitations-code.component.scss'],
    standalone: false
})
export class InvitationsCodeComponent implements OnInit, OnDestroy {

  invitationsForm: FormGroup;
  listInvitationsCode: InvitationsCodeList[] = [];
  loadInvitationsButtons = false;
  showStatsModal = false;
  error: string | null = null;
  successMessage: string | null = null;

  private _unsubscribe$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _invitationsCodeService: InvitationsCodeService,
    private _emailNotificationService: EmailNotificationService,
    private _alertService: AlertService,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService
  ) {
    this.invitationsForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit() {
    this.getInvitationsCode();
  }

  ngOnDestroy() {
    this._unsubscribe$.next();
    this._unsubscribe$.complete();
  }

  getInvitationsCode() {
    this.error = null;
    this._invitationsCodeService.getInvitationsCode().pipe(takeUntil(this._unsubscribe$)).subscribe({
      next: (invitationsCode: InvitationsCodeList[]) => {
        this.listInvitationsCode = invitationsCode;
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'InvitationsCodeComponent',
          'Error loading invitations',
          { error: String(error) }
        );
        this.error = translations['admin.invitationsCode.errors.loadError'];
        this._cdr.markForCheck();
      }
    });
  }

  createInvitations() {
    this.loadInvitationsButtons = true;
    this.error = null;
    
    if (this.invitationsForm.valid) {
      this._invitationsCodeService.postGenerateInvitationsCode(this.invitationsForm.value.email).pipe(takeUntil(this._unsubscribe$)).subscribe({
        next: (response: InvitationsCodeList) => {
          this.sendEmailCode(this.invitationsForm.value.email, response.code);
          this.clearInvitationsForm();
          this.getInvitationsCode();
          this.loadInvitationsButtons = false;
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'InvitationsCodeComponent',
            'Error creating invitation',
            { error: String(error), email: this.invitationsForm.value.email }
          );
          this.error = translations['admin.invitationsCode.errors.createError'];
          this.loadInvitationsButtons = false;
          this._cdr.markForCheck();
        }
      });
    } else {
      this.loadInvitationsButtons = false;
    }
  }

  private clearInvitationsForm() {
    this.invitationsForm.reset();
  }

  private sendEmailCode(email: string, code: string) {
    const subject = translations['admin.invitationsCode.email.subject'].replace('{platform}', environment.META_TITLE);
    const title = translations['admin.invitationsCode.email.title'];
    const greet = translations['admin.invitationsCode.email.greet'];
    const message = translations['admin.invitationsCode.email.message'];
    const subMessage = translations['admin.invitationsCode.email.subMessage'].replace('{code}', code);
    const buttonMessage = translations['admin.invitationsCode.email.buttonMessage'];
    const urlSlug = 'auth/register';

    this._emailNotificationService.sendGeneralEmailing(
      email,
      subject,
      title,
      greet,
      message,
      subMessage,
      buttonMessage,
      urlSlug
    );
  }

  // TrackBy function for better performance
  trackByInvitation(index: number, invitation: InvitationsCodeList): number {
    return invitation._id;
  }

  // Copy code to clipboard
  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      // You could add a toast notification here
      this._logService.log(
        LevelLogEnum.INFO,
        'InvitationsCodeComponent',
        'Code copied to clipboard',
        { code }
      );
    }).catch(err => {
      this._logService.log(
        LevelLogEnum.ERROR,
        'InvitationsCodeComponent',
        'Failed to copy code to clipboard',
        { error: String(err), code }
      );
    });
  }

  // Resend invitation
  resendInvitation(invitation: InvitationsCodeList) {
    this.sendEmailCode(invitation.email, invitation.code);
    // You could add a toast notification here
    this._logService.log(
      LevelLogEnum.INFO,
      'InvitationsCodeComponent',
      'Invitation resent',
      { email: invitation.email, code: invitation.code }
    );
  }

  // Delete invitation
  deleteInvitation(id: number) {
    this._alertService.showConfirmation(
      'Eliminar Invitación',
      '¿Estás seguro de que quieres eliminar esta invitación? Esta acción no se puede deshacer.',
      'Sí, eliminar',
      'Cancelar',
      Alerts.WARNING,
      Position.CENTER
    ).pipe(
      switchMap(confirmed => {
        if (confirmed) {
          this.loadInvitationsButtons = true;
          this.error = null;
          
          return this._invitationsCodeService.deleteInvitation(id);
        } else {
          return [];
        }
      }),
      takeUntil(this._unsubscribe$)
    ).subscribe({
      next: (response) => {
        if (response && response.success) {
          // Remove from local array
          this.listInvitationsCode = this.listInvitationsCode.filter(invitation => invitation._id !== id);
          this.successMessage = response.message;
          this.error = null;
          this._logService.log(
            LevelLogEnum.INFO,
            'InvitationsCodeComponent',
            'Invitation deleted successfully',
            { invitationId: id, message: response.message }
          );
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = null;
            this._cdr.markForCheck();
          }, 3000);
        } else if (response) {
          this.error = 'Error al eliminar la invitación.';
          this.successMessage = null;
        }
        this.loadInvitationsButtons = false;
        this._cdr.markForCheck();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'InvitationsCodeComponent',
          'Error deleting invitation',
          { error: String(error), invitationId: id, status: error.status }
        );
        this.successMessage = null;
        if (error.status === 404) {
          this.error = 'Invitación no encontrada.';
        } else if (error.status === 400) {
          this.error = 'ID de invitación requerido.';
        } else {
          this.error = 'Error al eliminar la invitación. Por favor, intenta de nuevo.';
        }
        this.loadInvitationsButtons = false;
        this._cdr.markForCheck();
      }
    });
  }

  // Stats modal methods
  showStats() {
    this.showStatsModal = true;
    this._cdr.markForCheck();
  }

  closeStats() {
    this.showStatsModal = false;
    this._cdr.markForCheck();
  }

  // Statistics calculation methods
  getTodayInvitations(): number {
    const today = new Date();
    return this.listInvitationsCode.filter(invitation => {
      const invitationDate = new Date(invitation.createdAt);
      return invitationDate.toDateString() === today.toDateString();
    }).length;
  }

  getThisWeekInvitations(): number {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.listInvitationsCode.filter(invitation => {
      const invitationDate = new Date(invitation.createdAt);
      return invitationDate >= startOfWeek;
    }).length;
  }

  getThisMonthInvitations(): number {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return this.listInvitationsCode.filter(invitation => {
      const invitationDate = new Date(invitation.createdAt);
      return invitationDate >= startOfMonth;
    }).length;
  }
}

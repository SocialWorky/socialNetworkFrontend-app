import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { InvitationsCodeService } from './services/invitations-code.service';
import { Subject, takeUntil } from 'rxjs';
import { InvitationsCodeList } from './interface/invitations-code.interface';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmailNotificationService } from '@shared/services/notifications/email-notification.service';
import { environment } from '@env/environment';

@Component({
    selector: 'worky-invitations-code',
    templateUrl: './invitations-code.component.html',
    styleUrls: ['./invitations-code.component.css'],
    standalone: false
})
export class InvitationsCodeComponent  implements OnInit {

  invitationsForm: FormGroup;

  listInvitationsCode: InvitationsCodeList[] = [];

  loadInvitationsButtons = false;

  private _unsubscribe$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _invitationsCodeService: InvitationsCodeService,
    private _emailNotificationService: EmailNotificationService,
    private _cdr: ChangeDetectorRef,
  ) {
    this.invitationsForm = this._fb.group({
      email: ['', Validators.required],
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
    this._invitationsCodeService.getInvitationsCode().pipe(takeUntil(this._unsubscribe$)).subscribe({
      next: (invitationsCode: InvitationsCodeList[]) => {
        this.listInvitationsCode = invitationsCode;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  createInvitations() {
    this.loadInvitationsButtons = true;
    if (this.invitationsForm.valid) {

      this._invitationsCodeService.postGenerateInvitationsCode(this.invitationsForm.value.email).pipe(takeUntil(this._unsubscribe$)).subscribe({
        next: (response: InvitationsCodeList) => {
          this.sendEmailCode(this.invitationsForm.value.email, response.code);
          this.clearInvitationsForm();
          this.getInvitationsCode();
          this.loadInvitationsButtons = false;
        },
        error: (error) => {
          console.error(error);
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

    const subject = `Invitación a ${environment.META_TITLE}`;
    const title = 'Codigo de invitación';
    const greet = 'Hola';
    const message = 'Has sido invitado a unirte a nuestra plataforma';
    const subMessage = `Tu codigo de invitación es: ${code} <br>
                        recuerda usar el mismo correo electronico para registrarte. <br>
                        Puedes unirte a nuestra plataforma haciendo click en el siguiente boton:`;
    const buttonMessage = 'Unirme';
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

}

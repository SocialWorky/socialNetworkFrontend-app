import { ChangeDetectorRef, Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';

import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';
import { RegisterData } from '@auth/interfaces/register.interface';
import { AuthApiRegisterService } from '@auth/services/apiRegister.service';
import { environment } from '@env/environment';
import { RoleUser } from '@auth/models/roleUser.enum';
import { MailSendValidateData } from '@shared/interfaces/mail.interface';
import { AlertService } from '@shared/services/alert.service';
import { translations } from '@translations/translations';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { TemplateEmail } from '@shared/interfaces/mail.interface';
import { map, Subject, Subscription, takeUntil, finalize } from 'rxjs';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';
import { Field } from '@shared/modules/form-builder/interfaces/field.interface';
import { CustomFieldDestination, CustomFieldType } from '@shared/modules/form-builder/interfaces/custom-field.interface';
import { buildDynamicFieldValidators } from '@shared/modules/form-builder/data/dynamic-field-validators';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
    selector: 'worky-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    standalone: false
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerLoading: boolean = false;

  registerForm: FormGroup = new FormGroup({});

  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;

  mailDataValidate: MailSendValidateData = {} as MailSendValidateData;

  invitationCode = false;

  requirePrivacyPolicy = false;

  privacyPolicyContent = '';

  showPrivacyModal = false;

  dynamicFieldsForm!: FormGroup;

  dynamicFields: Field[] = [];

  enumCustomFieldType = CustomFieldType;

  private cascadeSubs: Subscription[] = [];

  private unsubscribe$ = new Subject<void>();

  @ViewChild('emailInput') emailInput!: ElementRef;

  @ViewChild('userNameInput') userNameInput!: ElementRef;

  constructor(
    private _formBuilder: FormBuilder,
    private _authApiRegisterService: AuthApiRegisterService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
    private _configService: ConfigService,
    private _cdr: ChangeDetectorRef,
    private _customFieldService: CustomFieldService,
    private _logService: LogService,
  ) {
    this._configService.getConfig().pipe(takeUntil(this.unsubscribe$)).subscribe((configData) => {
      this.invitationCode = configData.settings?.invitationCode ?? false;
      this.requirePrivacyPolicy = configData.settings?.requirePrivacyPolicy ?? false;
      this.privacyPolicyContent = configData.settings?.privacyPolicy || '';

      const invCode = this.registerForm.get('invitationCode');
      if (invCode) {
        invCode.setValidators(this.invitationCode ? [Validators.required] : []);
        invCode.updateValueAndValidity();
      }
      const privPolicy = this.registerForm.get('acceptedPrivacyPolicy');
      if (privPolicy) {
        privPolicy.setValidators(this.requirePrivacyPolicy ? [Validators.requiredTrue] : []);
        privPolicy.updateValueAndValidity();
      }

      this._cdr.markForCheck();
    });
  }

  get isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  get isIPhoneWithNotch(): boolean {
    return this.isIOS && window.screen.height >= 812;
  }

  ngOnInit() {
    this.registerForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(4)]],
      lastName: ['', [Validators.required, Validators.minLength(4)]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      invitationCode: ['', this.invitationCode ? [Validators.required] : []],
      acceptedPrivacyPolicy: [false, this.requirePrivacyPolicy ? [Validators.requiredTrue] : []],
      role: [RoleUser.USER],
    });

    if (this.isIPhoneWithNotch) {
      document.body.classList.add('iphone-with-notch');
    }

    this.loadDynamicFields();
  }

  ngOnDestroy(): void {
    this.cascadeSubs.forEach((sub) => sub.unsubscribe());
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private loadDynamicFields(): void {
    this._customFieldService.getCustomFields()
      .pipe(
        takeUntil(this.unsubscribe$),
        map((fields: any[]) =>
          fields.filter(
            (field) =>
              field.destination === CustomFieldDestination.REGISTRATION &&
              field.isActive,
          ),
        ),
      )
      .subscribe((fields: any[]) => {
        if (fields.length === 0) return;

        const group: Record<string, FormControl> = {};

        fields.forEach((field: any) => {
          const validators = buildDynamicFieldValidators(field.type, field.options);
          const initial = field.type === CustomFieldType.BOOLEAN ? false : '';

          group[field.id] = new FormControl(initial, validators);

          this.dynamicFields.push({
            id: field.id,
            index: field.index,
            idName: field.idName,
            type: field.type,
            label: field.label,
            isActive: field.isActive,
            options: field.options?.choices || [],
            required: field.options?.required || false,
            placeholder: field.options?.placeholder || '',
            destination: field.destination,
            cascade: field.options?.cascade || undefined,
            additionalOptions: {
              multiSelect: field.options?.multiSelect || false,
              visible: field.options?.visible ?? true,
              required: field.options?.required || false,
              minLength: field.options?.minLength || 0,
              maxLength: field.options?.maxLength || 50,
            },
          });
        });

        this.dynamicFieldsForm = this._formBuilder.group(group);
        // Nest under the main form so the values flow into the register payload
        // and contribute to overall form validity automatically.
        this.registerForm.addControl('dynamicFields', this.dynamicFieldsForm);

        this.setupCascade();
        this._cdr.markForCheck();
      });
  }

  private setupCascade(): void {
    this.cascadeSubs.forEach((sub) => sub.unsubscribe());
    this.cascadeSubs = [];

    this.dynamicFields.forEach((child) => {
      const dependsOn = child.cascade?.dependsOn;
      if (!dependsOn) return;

      const parent = this.dynamicFields.find((f) => f.idName === dependsOn);
      if (!parent) return;

      const parentControl = this.dynamicFieldsForm.get(parent.id);
      if (!parentControl) return;

      this.applyCascadeChild(child, parentControl.value, false);

      const sub = parentControl.valueChanges
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe((value: any) => this.applyCascadeChild(child, value, true));
      this.cascadeSubs.push(sub);
    });
  }

  private applyCascadeChild(child: Field, parentValue: any, reset: boolean): void {
    child.options = child.cascade?.optionsByParent?.[parentValue] || [];
    if (reset) {
      this.dynamicFieldsForm.get(child.id)?.setValue('', { emitEvent: true });
    }
    this._cdr.markForCheck();
  }

  isInputFieldType(type?: string): boolean {
    return !!type && ['text', 'number', 'email', 'phone', 'url', 'date'].includes(type);
  }

  cascadeDepth(field: Field): number {
    let depth = 0;
    let current: Field | undefined = field;
    const guard = new Set<string>();

    while (current?.cascade?.dependsOn && !guard.has(current.idName)) {
      guard.add(current.idName);
      const parentIdName: string = current.cascade.dependsOn;
      current = this.dynamicFields.find((f) => f.idName === parentIdName);
      if (!current) break;
      depth++;
    }

    return depth;
  }

  openPrivacyModal(): void {
    this.showPrivacyModal = true;
    this._cdr.markForCheck();
  }

  closePrivacyModal(): void {
    this.showPrivacyModal = false;
    this._cdr.markForCheck();
  }

  async register() {
    if (this.registerForm.invalid) return;

    this.registerLoading = true;

    const baseUrl = environment.BASE_URL;

    const loading = await this._loadingCtrl.create({
      message: translations['register.messageLoading'],
    });

    this.mailDataValidate.url = `${baseUrl}/auth/validate/`;
    this.mailDataValidate.subject = translations['email.validateEmailSubject'];
    this.mailDataValidate.title = `${translations['email.validateEmailTitle']} ${environment.META_TITLE}`;
    this.mailDataValidate.greet = translations['email.validateEmailGreet'];
    this.mailDataValidate.subMessage = translations['email.validateEmailSubMessage'];
    this.mailDataValidate.template = TemplateEmail.WELCOME;
    this.mailDataValidate.templateLogo = environment.TEMPLATE_EMAIL_LOGO;
    this.mailDataValidate.buttonMessage = this.invitationCode ? translations['email.validateEmailMessageRegisteredSubMessage'] : translations['email.validateEmailButtonMessage'];
    this.mailDataValidate.message = this.invitationCode ? translations['email.validateEmailMessageRegistered'] : translations['email.validateEmailMessage'];

    const body = this.registerForm.value as RegisterData;
    body.mailDataValidate = this.mailDataValidate;

    await loading.present();

    this._authApiRegisterService.registerUser(body).pipe(
      takeUntil(this.unsubscribe$),
      finalize(() => {
        this.registerLoading = false;
        this._cdr.markForCheck();
      }),
    ).subscribe({
      next: (response) => {
        const emailAlreadyVerified = (response as { isVerified?: boolean })?.isVerified ?? this.invitationCode;
        this._alertService.showAlert(
          emailAlreadyVerified ? translations['alert.title_success_register_verified'] : translations['alert.title_success_register'],
          emailAlreadyVerified ? translations['alert.message_success_register_verified'] : translations['alert.message_success_register'],
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          translations['button.ok'],
          ['/auth/login'],
        );
        loading.dismiss();
      },
      error: (e) => {
        const msg: string = e?.error?.message || '';

        if (msg === 'E-mail is already in use') {
          this.registerForm.get('email')?.setErrors({ emailInUse: true });
          this.emailInput.nativeElement.focus();
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerEmailInUse'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        } else if (msg === 'Username is already in use') {
          this.registerForm.get('username')?.setErrors({ usernameInUse: true });
          this.userNameInput.nativeElement.focus();
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerUsernameInUse'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        } else if (msg === 'Failed send email') {
          this._alertService.showAlert(
            translations['alert.title_error_send_email'],
            translations['alert.message_error_send_email'],
            Alerts.INFO,
            Position.CENTER,
            true,
            translations['button.ok'],
            ['/auth/login'],
          );
        } else if (msg === 'Invalid invitation code' || msg === 'Invitation code is required') {
          this.registerForm.get('invitationCode')?.setErrors({ invalidInvitationCode: true });
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerInvalidInvitationCode'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        } else if (msg === 'Privacy policy acceptance is required') {
          this.registerForm.get('acceptedPrivacyPolicy')?.setErrors({ required: true });
          this._alertService.showAlert(
            translations['alert.title_error_register'],
            translations['alert.registerPrivacyPolicyRequired'],
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
        }

        loading.dismiss();
      }
    });
  }
}


import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { translations } from '@translations/translations';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { EmailTemplateAdminService } from '@admin/services/email-template.service';
import {
  EMAIL_TEMPLATE_VARIABLES,
  EMAIL_TYPE_LABELS,
  EmailNotificationType,
  EmailTemplate,
} from '@admin/interfaces/email-template.interface';

@Component({
  selector: 'worky-email-template-management',
  templateUrl: './email-template-management.component.html',
  styleUrls: ['./email-template-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EmailTemplateManagementComponent implements OnInit, OnDestroy {
  readonly translations = translations;

  templates: EmailTemplate[] = [];
  selected: EmailTemplate | null = null;
  editForm: FormGroup;
  isLoading = true;
  isSaving = false;
  isResetting = false;

  readonly typeLabels = EMAIL_TYPE_LABELS;
  readonly templateVariables = EMAIL_TEMPLATE_VARIABLES;
  readonly urlSlugPlaceholder = 'publication/{{publicationId}}';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private emailTemplateService: EmailTemplateAdminService,
    private alertService: AlertService,
  ) {
    this.editForm = this.fb.group({
      subject: [''],
      title: [''],
      greet: [''],
      message: [''],
      subMessage: [''],
      buttonMessage: [''],
      urlSlug: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.emailTemplateService.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (templates) => {
        this.templates = templates;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.alertService.showAlert(
          translations['admin.emailTemplates.errors.loadError'],
          '',
          Alerts.ERROR,
          Position.CENTER,
          true,
          translations['button.ok'],
        );
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTemplate(template: EmailTemplate): void {
    this.selected = template;
    this.editForm.patchValue({
      subject: template.subject,
      title: template.title,
      greet: template.greet,
      message: template.message,
      subMessage: template.subMessage,
      buttonMessage: template.buttonMessage,
      urlSlug: template.urlSlug ?? '',
      isActive: template.isActive,
    }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.selected || this.isSaving) return;

    this.isSaving = true;
    const dto = this.editForm.value;

    this.emailTemplateService.update(this.selected.type, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.selected = updated;
          this.templates = this.templates.map((t) =>
            t.type === updated.type ? updated : t,
          );
          this.isSaving = false;
          this.alertService.showAlert(
            translations['admin.emailTemplates.success.updated'],
            '',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSaving = false;
          this.alertService.showAlert(
            translations['admin.emailTemplates.errors.saveError'],
            '',
            Alerts.ERROR,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
          this.cdr.markForCheck();
        },
      });
  }

  resetToDefault(): void {
    if (!this.selected || this.isResetting) return;

    const confirmed = confirm(translations['admin.emailTemplates.actions.resetConfirm']);
    if (!confirmed) return;

    this.isResetting = true;

    this.emailTemplateService.resetToDefault(this.selected.type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (restored) => {
          this.selected = restored;
          this.templates = this.templates.map((t) =>
            t.type === restored.type ? restored : t,
          );
          this.selectTemplate(restored);
          this.isResetting = false;
          this.alertService.showAlert(
            translations['admin.emailTemplates.success.reset'],
            '',
            Alerts.SUCCESS,
            Position.CENTER,
            true,
            translations['button.ok'],
          );
          this.cdr.markForCheck();
        },
        error: () => {
          this.isResetting = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleActive(): void {
    const current = this.editForm.get('isActive')?.value;
    this.editForm.patchValue({ isActive: !current });
  }

  copyVariable(variable: string): void {
    navigator.clipboard?.writeText(variable).catch(() => {});
  }

  get availableVariables(): string[] {
    return this.selected
      ? (this.templateVariables[this.selected.type as EmailNotificationType] ?? [])
      : [];
  }
}

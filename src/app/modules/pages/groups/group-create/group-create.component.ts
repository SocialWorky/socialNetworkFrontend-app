import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GroupsService } from '@shared/services/core-apis/groups.service';

@Component({
  selector: 'worky-group-create',
  templateUrl: './group-create.component.html',
  styleUrls: ['./group-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class GroupCreateComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  @Output() created = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  privacyOptions = ['public', 'private', 'secret'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly groupsService: GroupsService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', Validators.maxLength(500)],
      category: ['', Validators.maxLength(80)],
      privacy: ['public'],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get nameLength(): number {
    return this.form.get('name')?.value?.length ?? 0;
  }

  get descriptionLength(): number {
    return this.form.get('description')?.value?.length ?? 0;
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    this.error = null;
    this.cdr.markForCheck();

    this.groupsService.createGroup(this.form.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
          this.created.emit();
        },
        error: () => {
          this.isSubmitting = false;
          this.error = 'Error creating group';
          this.cdr.markForCheck();
        },
      });
  }
}

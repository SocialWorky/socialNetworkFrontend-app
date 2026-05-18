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
      description: [''],
      category: [''],
      privacy: ['public'],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    this.error = null;

    this.groupsService.createGroup(this.form.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '@shared/services/core-apis/events.service';

@Component({
  selector: 'worky-event-create',
  templateUrl: './event-create.component.html',
  styleUrls: ['./event-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EventCreateComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  @Output() created = new EventEmitter<void>();

  form: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly eventsService: EventsService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      date: ['', Validators.required],
      locationType: ['virtual'],
      location: [''],
      price: [0, [Validators.min(0)]],
      maxTickets: [0, [Validators.min(0)]],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    const price = this.form.value.price;
    if (price > 0 && price < 1000) {
      this.error = 'El precio debe ser 0 (gratis) o ≥ CLP 1.000';
      this.cdr.markForCheck();
      return;
    }
    this.isSubmitting = true;
    this.error = null;

    this.eventsService.createEvent(this.form.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          this.eventsService.publishEvent(event._id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { this.isSubmitting = false; this.created.emit(); },
            error: () => { this.isSubmitting = false; this.created.emit(); },
          });
        },
        error: () => {
          this.isSubmitting = false;
          this.error = 'Error al crear el evento';
          this.cdr.markForCheck();
        },
      });
  }
}

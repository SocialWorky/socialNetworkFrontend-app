import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { EventsService, CreateEventPayload } from '@shared/services/core-apis/events.service';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';

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

  coverFile: File | null = null;
  coverPreview: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly eventsService: EventsService,
    private readonly fileUploadService: FileUploadService,
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

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.coverFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.coverPreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  removeCover(): void {
    this.coverFile = null;
    this.coverPreview = null;
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

    // Upload the cover first (if any), then create the event with its URL.
    if (this.coverFile) {
      this.fileUploadService
        .uploadFile([this.coverFile], 'events', null, null, TypePublishing.PROFILE_IMG)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const coverImage = response?.files?.[0]?.urlCompressed || response?.files?.[0]?.url || undefined;
            this.createEvent({ ...this.form.value, coverImage });
          },
          error: () => this.createEvent(this.form.value),
        });
    } else {
      this.createEvent(this.form.value);
    }
  }

  private createEvent(payload: CreateEventPayload): void {
    this.eventsService.createEvent(payload)
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

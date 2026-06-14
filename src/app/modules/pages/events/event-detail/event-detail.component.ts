import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService, SocialEvent, Ticket, Attendee } from '@shared/services/core-apis/events.service';
import { AuthService } from '@auth/services/auth.service';
import { translations } from '@translations/translations';
import { AlertService } from '@shared/services/alert.service';
import { Alerts } from '@shared/enums/alerts.enum';

@Component({
  selector: 'worky-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EventDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  event: SocialEvent | null = null;
  attendees: Attendee[] = [];
  myTicket: Ticket | null = null;
  confirmingId: string | null = null;
  isLoading = true;
  isRegistering = false;
  isCancelling = false;
  isLeaving = false;
  currentUserId = '';
  error: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly eventsService: EventsService,
    private readonly authService: AuthService,
    private readonly alertService: AlertService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getDecodedToken()?.id ?? '';
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadEvent(id);
    this.loadMyTicket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEvent(id: string): void {
    this.eventsService.getEvent(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (e) => {
        this.event = e;
        this.isLoading = false;
        if (e.creatorId === this.currentUserId) this.loadAttendees(id);
        this.cdr.markForCheck();
      },
      error: () => { this.isLoading = false; this.cdr.markForCheck(); },
    });
  }

  private loadMyTicket(): void {
    this.eventsService.getMyTickets().pipe(takeUntil(this.destroy$)).subscribe({
      next: (tickets) => {
        const eventId = this.route.snapshot.paramMap.get('id')!;
        this.myTicket = tickets.find((t) => t.eventId === eventId && t.status !== 'cancelled') ?? null;
        this.cdr.markForCheck();
      },
    });
  }

  private loadAttendees(id: string): void {
    this.eventsService.getAttendees(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (a) => { this.attendees = a; this.cdr.markForCheck(); },
    });
  }

  registerOrBuy(): void {
    if (!this.event || this.isRegistering) return;
    this.isRegistering = true;
    this.error = null;
    this.eventsService.registerTicket(this.event._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.isRegistering = false;
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          this.loadMyTicket();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isRegistering = false;
        this.error = this.mapRegisterError(err?.error?.message);
        this.cdr.markForCheck();
      },
    });
  }

  cancelMyTicket(): void {
    if (!this.event || !this.myTicket || this.isLeaving) return;
    this.alertService.showConfirmation(
      translations['events.leave'],
      translations['events.leaveConfirm'],
      translations['events.leave'],
      translations['button.cancel'],
      Alerts.WARNING,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.doLeaveEvent();
    });
  }

  private doLeaveEvent(): void {
    if (!this.event || !this.myTicket) return;
    this.isLeaving = true;
    this.error = null;
    this.cdr.markForCheck();

    const eventId = this.event._id;
    this.eventsService.cancelTicket(this.myTicket._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.myTicket = null;
        this.isLeaving = false;
        this.loadEvent(eventId); // refresh availability + state
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLeaving = false;
        this.error = this.mapRegisterError(err?.error?.message);
        this.cdr.markForCheck();
      },
    });
  }

  confirmAttendee(ticketId: string): void {
    if (!this.event || this.confirmingId) return;
    this.confirmingId = ticketId;
    this.cdr.markForCheck();

    const eventId = this.event._id;
    this.eventsService.confirmAttendee(eventId, ticketId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const a = this.attendees.find((x) => x._id === ticketId);
        if (a) a.status = 'confirmed';
        this.confirmingId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.confirmingId = null;
        this.cdr.markForCheck();
      },
    });
  }

  /** Maps backend error codes to friendly, translated messages. */
  private mapRegisterError(code?: string): string {
    const key = `events.error.${code}`;
    return translations[key] || translations['events.error.generic'];
  }

  cancelEvent(): void {
    if (!this.event || this.isCancelling) return;
    this.alertService.showConfirmation(
      translations['events.cancel'],
      translations['events.cancelConfirm'],
      translations['events.cancel'],
      translations['button.no'],
      Alerts.WARNING,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.doCancelEvent();
    });
  }

  private doCancelEvent(): void {
    if (!this.event) return;
    this.isCancelling = true;
    this.error = null;
    this.cdr.markForCheck();

    this.eventsService.cancelEvent(this.event._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.event) this.event.status = 'cancelled';
        this.isCancelling = false;
        this.cdr.markForCheck();
        // Back to the list, which reloads fresh (the cancel already invalidated the cache).
        this.router.navigate(['/events']);
      },
      error: () => {
        this.isCancelling = false;
        this.error = translations['events.cancelError'];
        this.cdr.markForCheck();
      },
    });
  }

  formatDate(d: string): string { return this.eventsService.formatDate(d); }
  formatPrice(p: number): string { return this.eventsService.formatPrice(p); }
  coverUrl(url: string | null): string { return this.eventsService.coverImageUrl(url); }
  statusLabel(status: string): string { return translations[`events.status.${status}`] || status; }

  get isCreator(): boolean { return this.event?.creatorId === this.currentUserId; }
  get canRegister(): boolean { return !this.myTicket && this.event?.status === 'published' && (this.event?.ticketsAvailable === null || (this.event?.ticketsAvailable ?? 1) > 0); }
}

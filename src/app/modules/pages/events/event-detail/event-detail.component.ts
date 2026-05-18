import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService, SocialEvent, Ticket } from '@shared/services/core-apis/events.service';
import { AuthService } from '@auth/services/auth.service';

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
  attendees: Ticket[] = [];
  myTicket: Ticket | null = null;
  isLoading = true;
  isRegistering = false;
  currentUserId = '';
  error: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly eventsService: EventsService,
    private readonly authService: AuthService,
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
        this.error = err?.error?.message ?? 'Error al registrarse';
        this.cdr.markForCheck();
      },
    });
  }

  cancelEvent(): void {
    if (!this.event) return;
    this.eventsService.cancelEvent(this.event._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { if (this.event) this.event.status = 'cancelled'; this.cdr.markForCheck(); },
    });
  }

  formatDate(d: string): string { return this.eventsService.formatDate(d); }
  formatPrice(p: number): string { return this.eventsService.formatPrice(p); }

  get isCreator(): boolean { return this.event?.creatorId === this.currentUserId; }
  get canRegister(): boolean { return !this.myTicket && this.event?.status === 'published' && (this.event?.ticketsAvailable === null || (this.event?.ticketsAvailable ?? 1) > 0); }
}

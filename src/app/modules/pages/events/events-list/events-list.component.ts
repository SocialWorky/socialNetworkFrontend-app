import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService, SocialEvent } from '@shared/services/core-apis/events.service';
import { AuthService } from '@auth/services/auth.service';

@Component({
  selector: 'worky-events-list',
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EventsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  events: SocialEvent[] = [];
  total = 0;
  page = 1;
  isLoading = true;
  showCreateForm = false;
  filterType = '';
  isAdmin = false;

  constructor(
    private readonly eventsService: EventsService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.authService.getDecodedToken();
    this.isAdmin = token?.role === 'admin';
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.eventsService.getEvents(this.filterType || undefined, this.page)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.events = res.events;
          this.total = res.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isLoading = false; this.cdr.markForCheck(); },
      });
  }

  openEvent(id: string): void {
    this.router.navigate(['/events', id]);
  }

  onEventCreated(): void {
    this.showCreateForm = false;
    this.loadEvents();
  }

  formatPrice(price: number): string {
    return this.eventsService.formatPrice(price);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

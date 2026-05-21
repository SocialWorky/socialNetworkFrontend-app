import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { GroupsService, Group } from '@shared/services/core-apis/groups.service';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'worky-groups-list',
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class GroupsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  groups: Group[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  isLoading = true;
  showCreateForm = false;
  isAdmin = false;

  searchControl = new FormControl('');

  constructor(
    private readonly groupsService: GroupsService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.authService.getDecodedToken();
    this.isAdmin = token?.role === 'admin';
    this.loadGroups();

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        this.page = 1;
        this.loadGroups(q ?? '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroups(q?: string): void {
    this.isLoading = true;
    this.groupsService.getGroups(q, undefined, this.page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.groups = res.groups;
          this.total = res.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  openGroup(groupId: string): void {
    this.router.navigate(['/groups', groupId]);
  }

  joinGroup(event: Event, group: Group): void {
    event.stopPropagation();
    this.groupsService.joinGroup(group._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        group.isMember = true;
        this.cdr.markForCheck();
      },
    });
  }

  onGroupCreated(): void {
    this.showCreateForm = false;
    this.cdr.markForCheck();
    this.loadGroups();
  }

  getCoverUrl(coverImage: string | null): string {
    if (!coverImage) return '';
    if (coverImage.startsWith('http') || coverImage.startsWith('blob:') || coverImage.startsWith('data:')) return coverImage;
    return `${environment.MINIO_BUCKET_URL}/${coverImage}`;
  }
}

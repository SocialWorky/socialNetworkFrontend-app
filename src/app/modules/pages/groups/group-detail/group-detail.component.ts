import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GroupsService, Group, GroupMember } from '@shared/services/core-apis/groups.service';
import { AuthService } from '@auth/services/auth.service';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { environment } from '@env/environment';
import { translations } from '@translations/translations';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { UnifiedCacheService } from '@shared/services/unified-cache.service';
import { UtilityService } from '@shared/services/utility.service';
import { ScrollService } from '@shared/services/scroll.service';

@Component({
  selector: 'worky-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class GroupDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  group: (Group & { isMember?: boolean; myRole?: string; isAdmin?: boolean; isModerator?: boolean }) | null = null;
  members: GroupMember[] = [];
  pendingMembers: GroupMember[] = [];
  bannedMembers: GroupMember[] = [];
  menuMember: GroupMember | null = null;
  openMenuUserId: string | null = null;
  publications: any[] = [];
  activeTab: 'publications' | 'members' = 'publications';
  isLoading = true;
  isBanned = false;
  isUploadingCover = false;
  isUploadingAvatar = false;
  currentUserId = '';
  typePublishing = TypePublishing;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly groupsService: GroupsService,
    private readonly authService: AuthService,
    private readonly fileUploadService: FileUploadService,
    private readonly cdr: ChangeDetectorRef,
    private readonly alertService: AlertService,
    private readonly cacheService: UnifiedCacheService,
    private readonly utilityService: UtilityService,
    private readonly scrollService: ScrollService,
  ) {}

  // Feed scroll events to the shared ScrollService so the top/bottom navbars
  // auto-hide on scroll down and reappear on scroll up — same behavior as home
  // and profile (the navbar component reacts to ScrollService.scrollEnd$).
  onScroll(event: any): void {
    this.scrollService.onScroll(event);
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getDecodedToken()?.id ?? '';
    const groupId = this.route.snapshot.paramMap.get('id')!;
    this.loadGroup(groupId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isGroupAdmin(): boolean {
    return (this.group as any)?.isAdmin === true || this.group?.createdBy === this.currentUserId;
  }

  get coverBgUrl(): string {
    const img = this.group?.coverImage;
    if (!img) return '';
    return this.utilityService.normalizeImageUrl(img, environment.MINIO_BUCKET_URL || '');
  }

  get avatarUrl(): string {
    const img = (this.group as any)?.avatarImage;
    if (!img) return '';
    return this.utilityService.normalizeImageUrl(img, environment.MINIO_BUCKET_URL || '');
  }

  private loadGroup(groupId: string): void {
    this.groupsService.getGroupById(groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (g) => {
        this.group = g as any;
        this.isLoading = false;
        this.cdr.markForCheck();
        if ((g as any).isMember) {
          this.loadPublications(groupId);
          this.loadMembers(groupId);
          if ((g as any).isAdmin || (g as any).isModerator) {
            this.loadPendingMembers(groupId);
            this.loadBannedMembers(groupId);
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.error?.message === 'group_access_denied_banned') {
          this.isBanned = true;
        }
        this.cdr.markForCheck();
      },
    });
  }

  private loadPublications(groupId: string): void {
    this.groupsService.getGroupPublications(groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.publications = res.publications ?? [];
        this.cdr.markForCheck();
      },
    });
  }

  private loadMembers(groupId: string): void {
    this.groupsService.getMembers(groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (members) => {
        this.members = members;
        this.cdr.markForCheck();
      },
    });
  }

  private loadPendingMembers(groupId: string): void {
    this.groupsService.getPendingMembers(groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (pending) => {
        this.pendingMembers = pending;
        this.cdr.markForCheck();
      },
    });
  }

  private loadBannedMembers(groupId: string): void {
    this.groupsService.getBannedMembers(groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (banned) => {
        this.bannedMembers = banned;
        this.cdr.markForCheck();
      },
    });
  }

  joinGroup(): void {
    if (!this.group) return;
    this.groupsService.joinGroup(this.group._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.group) this.loadGroup(this.group._id);
        this.cdr.markForCheck();
      },
    });
  }

  leaveGroup(): void {
    if (!this.group) return;
    this.groupsService.leaveGroup(this.group._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.group) (this.group as any).isMember = false;
        this.cdr.markForCheck();
      },
    });
  }

  approveMember(userId: string): void {
    if (!this.group) return;
    this.groupsService.approveMember(this.group._id, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.pendingMembers = this.pendingMembers.filter((m) => m.userId !== userId);
        this.cdr.markForCheck();
      },
    });
  }

  onPublicationCreated(): void {
    if (this.group) this.loadPublications(this.group._id);
  }

  rejectMember(userId: string): void {
    if (!this.group) return;
    this.groupsService.rejectMember(this.group._id, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.pendingMembers = this.pendingMembers.filter((m) => m.userId !== userId);
        this.cdr.markForCheck();
      },
    });
  }

  openMemberMenu(member: GroupMember): void {
    this.menuMember = member;
  }

  toggleMemberMenu(member: GroupMember, event: Event): void {
    event.stopPropagation();
    if (this.openMenuUserId === member.userId) {
      this.openMenuUserId = null;
    } else {
      this.menuMember = member;
      this.openMenuUserId = member.userId;
    }
    this.cdr.markForCheck();
  }

  closeMemberMenu(): void {
    this.openMenuUserId = null;
    this.cdr.markForCheck();
  }

  kickMember(): void {
    const userId = this.menuMember?.userId;
    if (!this.group || !userId) return;
    const groupId = this.group._id;
    this.alertService.showConfirmation(
      translations['groups.kickConfirm'],
      '',
      translations['button.yes'] || 'Sí',
      translations['button.no'] || 'No',
      Alerts.WARNING,
      Position.CENTER,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.groupsService.removeMember(groupId, userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.members = this.members.filter((m) => m.userId !== userId);
          this.menuMember = null;
          this.cdr.markForCheck();
        },
      });
    });
  }

  banMember(): void {
    const userId = this.menuMember?.userId;
    if (!this.group || !userId) return;
    const groupId = this.group._id;
    this.alertService.showConfirmation(
      translations['groups.banConfirm'],
      '',
      translations['button.yes'] || 'Sí',
      translations['button.no'] || 'No',
      Alerts.WARNING,
      Position.CENTER,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.groupsService.banMember(groupId, userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (banned) => {
          this.members = this.members.filter((m) => m.userId !== userId);
          this.bannedMembers = [...this.bannedMembers, banned];
          this.menuMember = null;
          if (this.group) (this.group as any).memberCount = Math.max(0, (this.group.memberCount ?? 1) - 1);
          this.alertService.showAlert(translations['groups.banSuccess'], '', Alerts.SUCCESS, Position.TOP_END);
          this.cdr.markForCheck();
        },
      });
    });
  }

  unbanMember(userId: string): void {
    if (!this.group) return;
    const groupId = this.group._id;
    this.alertService.showConfirmation(
      translations['groups.unbanConfirm'],
      '',
      translations['button.yes'] || 'Sí',
      translations['button.no'] || 'No',
      Alerts.QUESTION,
      Position.CENTER,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      const restoredMember = this.bannedMembers.find((m) => m.userId === userId);
      this.groupsService.unbanMember(groupId, userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.bannedMembers = this.bannedMembers.filter((m) => m.userId !== userId);
          if (restoredMember) {
            this.members = [...this.members, { ...restoredMember, status: 'active' as any, role: restoredMember.role }];
            if (this.group) (this.group as any).memberCount = (this.group.memberCount ?? 0) + 1;
          }
          this.cacheService.clearByTags(['publication']);
          this.alertService.showAlert(translations['groups.unbanSuccess'], '', Alerts.SUCCESS, Position.TOP_END);
          this.cdr.markForCheck();
        },
      });
    });
  }

  onCoverChange(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length || !this.group) return;
    this.isUploadingCover = true;
    this.cdr.markForCheck();

    this.fileUploadService.uploadFile(files, 'groups', this.group._id, null, TypePublishing.PROFILE_IMG)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const relUrl: string = res?.files?.[0]?.url ?? res?.files?.[0]?.filename ?? '';
          if (relUrl && this.group) {
            this.groupsService.updateGroup(this.group._id, { coverImage: relUrl })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  if (this.group) this.group = { ...this.group, coverImage: relUrl };
                  this.isUploadingCover = false;
                  this.cdr.markForCheck();
                },
              });
          } else {
            this.isUploadingCover = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.isUploadingCover = false;
          this.cdr.markForCheck();
        },
      });

    (event.target as HTMLInputElement).value = '';
  }

  onAvatarChange(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length || !this.group) return;
    this.isUploadingAvatar = true;
    this.cdr.markForCheck();

    this.fileUploadService.uploadFile(files, 'groups', this.group._id, null, TypePublishing.PROFILE_IMG)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const relUrl: string = res?.files?.[0]?.url ?? res?.files?.[0]?.filename ?? '';
          if (relUrl && this.group) {
            this.groupsService.updateGroup(this.group._id, { avatarImage: relUrl } as any)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  if (this.group) this.group = { ...this.group, avatarImage: relUrl } as any;
                  this.isUploadingAvatar = false;
                  this.cdr.markForCheck();
                },
              });
          } else {
            this.isUploadingAvatar = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.isUploadingAvatar = false;
          this.cdr.markForCheck();
        },
      });

    (event.target as HTMLInputElement).value = '';
  }
}

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { TranslationsPipe } from '@shared/modules/translations/pipes/translations.pipe';

@Component({
  selector: 'worky-feature-flags',
  templateUrl: './feature-flags.component.html',
  styleUrls: ['./feature-flags.component.scss'],
  standalone: true,
  imports: [CommonModule, NgClass, TranslationsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureFlagsComponent implements OnInit {
  groupsEnabled = true;
  eventsEnabled = true;
  locationDiscoveryEnabled = true;
  subscriptionModeEnabled = false;
  isSaving = false;
  savedMessage = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const snapshot = this.configService.configSnapshot();
    if (snapshot?.settings) {
      this.groupsEnabled = snapshot.settings.groupsEnabled ?? true;
      this.eventsEnabled = snapshot.settings.eventsEnabled ?? true;
      this.locationDiscoveryEnabled = snapshot.settings.locationDiscoveryEnabled ?? true;
      this.subscriptionModeEnabled = snapshot.settings.subscriptionMode ?? false;
    }
  }

  toggleGroups(): void {
    this.groupsEnabled = !this.groupsEnabled;
    this.save();
  }

  toggleEvents(): void {
    this.eventsEnabled = !this.eventsEnabled;
    this.save();
  }

  toggleLocationDiscovery(): void {
    this.locationDiscoveryEnabled = !this.locationDiscoveryEnabled;
    this.save();
  }

  toggleSubscriptionMode(): void {
    this.subscriptionModeEnabled = !this.subscriptionModeEnabled;
    this.save();
  }

  private save(): void {
    this.isSaving = true;
    this.savedMessage = false;
    this.configService.updateConfig({
      groupsEnabled: this.groupsEnabled,
      eventsEnabled: this.eventsEnabled,
      locationDiscoveryEnabled: this.locationDiscoveryEnabled,
      subscriptionMode: this.subscriptionModeEnabled,
    } as any).subscribe({
      next: () => {
        this.isSaving = false;
        this.savedMessage = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.savedMessage = false;
          this.cdr.markForCheck();
        }, 3000);
      },
      error: () => {
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }
}

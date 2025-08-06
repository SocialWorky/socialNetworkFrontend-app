import { Component, Input } from '@angular/core';

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pendingVerification: number;
}

@Component({
  selector: 'worky-user-stats',
  templateUrl: './user-stats.component.html',
  styleUrls: ['./user-stats.component.scss'],
  standalone: false
})
export class UserStatsComponent {
  @Input() stats: UserStats = {
    total: 0,
    active: 0,
    inactive: 0,
    pendingVerification: 0
  };
} 
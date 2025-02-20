import { Injectable } from '@angular/core';
import { driver } from 'driver.js';
import { UserService } from './core-apis/users.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';


@Injectable({
  providedIn: 'root'
})
export class TooltipsOnboardingService {
  private driverObj: any;

  private destroy$ = new Subject<void>();

  constructor(
    private _userService: UserService,
    private _authService: AuthService,
  ) {
    this.driverObj = driver({
      animate: true,
      allowClose: true,
      showProgress: true,
      doneBtnText: 'Finalizar',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      steps: [],
    });
  }

  public async start(steps: any[]) {

    const isTooltipActive = localStorage.getItem('isTooltipActive');

    if (!isTooltipActive || isTooltipActive === 'false') return;

    this.driverObj = driver({
      animate: true,
      allowClose: false,
      showProgress: true,
      doneBtnText: 'Finalizar',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      steps: steps,
      onDestroyed: () => this.onDone(),
    });
    this.driverObj.highlight(steps);
    this.driverObj.drive(0);

  }

  private onDone() {
    localStorage.setItem('isTooltipActive', 'false');
    const userId = this._authService.getDecodedToken()?.id!;
    this._userService.userEdit(userId, { isTooltipActive: false }).pipe(takeUntil(this.destroy$)).subscribe({});
    
  }
}

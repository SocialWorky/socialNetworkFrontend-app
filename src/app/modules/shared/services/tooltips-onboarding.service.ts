import { Injectable } from '@angular/core';
import { driver } from 'driver.js';
import { UserService } from './core-apis/users.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { LazyCssService } from './core-apis/lazy-css.service';

@Injectable({
  providedIn: 'root'
})
export class TooltipsOnboardingService {
  private driverObj: any;
  private driverCssLoaded = false;

  private destroy$ = new Subject<void>();

  constructor(
    private _userService: UserService,
    private _authService: AuthService,
    private _lazyCssService: LazyCssService
  ) {
    this.initializeDriver();
  }

  private async initializeDriver() {
    // Cargar CSS de driver.js de forma lazy
    await this.loadDriverCss();
    
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

  /**
   * Carga CSS de driver.js solo cuando se necesite
   */
  private async loadDriverCss() {
    if (!this.driverCssLoaded) {
      try {
        await this._lazyCssService.loadDriverCss();
        this.driverCssLoaded = true;
      } catch (error) {
        console.warn('Error cargando CSS de driver.js:', error);
      }
    }
  }

  public async start(steps: any[]) {

    const isTooltipActive = localStorage.getItem('isTooltipActive');

    if (!isTooltipActive || isTooltipActive === 'false') return;

    // Asegurar que el CSS esté cargado antes de iniciar
    await this.loadDriverCss();

    setTimeout(() => {

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

    }, 1000);

  }

  private onDone() {
    localStorage.setItem('isTooltipActive', 'false');
    const userId = this._authService.getDecodedToken()?.id!;
    this._userService.userEdit(userId, { isTooltipActive: false }).pipe(takeUntil(this.destroy$)).subscribe({});

  }
}

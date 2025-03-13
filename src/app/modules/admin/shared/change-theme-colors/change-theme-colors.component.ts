import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'worky-admin-change-theme-colors',
  templateUrl: './change-theme-colors.component.html',
  styleUrls: ['./change-theme-colors.component.scss']
})
export class ChangeThemeColorsComponent implements OnInit, OnDestroy {
  colors: { [key: string]: string } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private _configService: ConfigService,
    private _cdr: ChangeDetectorRef
  ) { }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit() {
    this.loadCurrentColors();
    this.loadColorsService();
  }

  loadCurrentColors() {
    const style = getComputedStyle(document.documentElement);
    const variables = [
      '--worky-color-navy', '--worky-color-yellow', '--worky-color-yellow-text',
      '--worky-color-green', '--worky-color-radium', '--worky-color-teal',
      '--worky-color-cyan', '--worky-color-blue', '--worky-color-indigo',
      '--worky-color-purple', '--worky-color-fuchsia', '--worky-color-magenta',
      '--worky-color-red', '--worky-color-light', '--worky-color-greyLight',
      '--worky-color-grey'
    ];

    variables.forEach(variable => {
      const value = style.getPropertyValue(variable).trim();
      this.colors[variable] = value || '#000000';
    });
  }

  async loadColorsService() {
    await this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      localStorage.setItem('theme', configData.settings.themeColors);
      const theme = JSON.parse(configData.settings.themeColors);
      Object.keys(theme).forEach(variable => {
        this.changeColor(variable, theme[variable]);
      });
    });
  }

  async changeColor(variable: string, color: string) {
    if (document.documentElement) {
      document.documentElement.style.setProperty(variable, color);
      this.colors[variable] = color;
      const theme = JSON.parse(localStorage.getItem('theme') || '{}');
      theme[variable] = color;
      localStorage.setItem('theme', JSON.stringify(theme));
      this._cdr.markForCheck();

      await this._configService.updateConfig({ themeColors: JSON.stringify(theme) }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (data) => {
          this._configService.setConfig(data);
          this._cdr.markForCheck();
        },
        error: () => {
          this._cdr.markForCheck();
        },
      });
    }
  }

  updateColor(event: Event, variable: string) {
    const input = event.target as HTMLInputElement;
    this.changeColor(variable, input.value);
  }

}

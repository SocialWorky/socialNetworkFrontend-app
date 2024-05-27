import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ConfigService } from '@shared/services/config.service';

@Component({
  selector: 'worky-admin-change-theme-colors',
  templateUrl: './change-theme-colors.component.html',
  styleUrls: ['./change-theme-colors.component.scss']
})
export class ChangeThemeColorsComponent implements OnInit {
  colors: { [key: string]: string } = {};


  constructor(
    private _configService: ConfigService,
    private _cdr: ChangeDetectorRef
  ) { }

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
    await this._configService.getConfig().subscribe((configData) => {
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

      await this._configService.updateConfig({ themeColors: JSON.stringify(theme) }).subscribe();
    }
  }




  updateColor(event: Event, variable: string) {
    const input = event.target as HTMLInputElement;
    this.changeColor(variable, input.value);
  }

}

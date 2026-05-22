import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { TranslationsPipe } from '@shared/modules/translations/pipes/translations.pipe';

@Component({
  selector: 'app-feature-unavailable',
  templateUrl: './feature-unavailable.component.html',
  styleUrls: ['./feature-unavailable.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslationsPipe],
})
export class FeatureUnavailableComponent {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}

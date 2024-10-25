import { Injectable } from '@angular/core';
import axios from 'axios';
import { ConfigService } from '@shared/services/config.service';
import { ConfigServiceInterface } from '@shared/interfaces/config.interface';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AxiomService {

  private axiomUrl = '';

  private axiomToken = '';

  private serviceEnabled = false;

  private destroy$ = new Subject<void>();

  constructor(
    private _configService: ConfigService
  ) {
    this._configService.getConfigServices().pipe(takeUntil(this.destroy$)).subscribe((config: ConfigServiceInterface) => {
      this.axiomUrl = config.services.logs.urlApi;
      this.axiomToken = config.services.logs.token;
      this.serviceEnabled = config.services.logs.enabled;
    });

  }

  async sendLog(event: any): Promise<void> {
    if (!this.serviceEnabled) return;
    try {
      await axios.post(
        this.axiomUrl,
        [event],
        {
          headers: {
            Authorization: `Bearer ${this.axiomToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error enviando el log a Axiom:', error);
    }
  }
}

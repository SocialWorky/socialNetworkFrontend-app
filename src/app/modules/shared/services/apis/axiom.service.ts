import { Injectable } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import axios from 'axios';

import { ConfigService } from '@shared/services/config.service';
import { ConfigServiceInterface } from '@shared/interfaces/config.interface';
import { environment } from '@env/environment';
import { AxiomLog } from '@shared/interfaces/axiom.interface';
import { AxiomType } from '@shared/interfaces/axiom.enum';

@Injectable({
  providedIn: 'root',
})
export class AxiomService {

  private axiomUrl = '';

  private axiomToken = '';

  private serviceEnabled = false;

  private destroy$ = new Subject<void>();

  private configLoaded: Promise<void>;

  constructor(
    private _configService: ConfigService
  ) {
    this.configLoaded = new Promise((resolve) => {
      this._configService.getConfigServices().pipe(takeUntil(this.destroy$)).subscribe((config: ConfigServiceInterface) => {
        this.axiomUrl = config.services.logs.urlApi;
        this.axiomToken = config.services.logs.token;
        this.serviceEnabled = config.services.logs.enabled;
        resolve();
      });
    });
  }

  async sendLog(event: AxiomLog): Promise<void> {
    await this.configLoaded;
    const app = environment.BASE_URL;
    if (!this.serviceEnabled) {
      if (event.type === AxiomType.ERROR) console.error(event);
      return;
    }
    try {
      await axios.post(
        this.axiomUrl,
        [ { ...event, url: app } ],
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

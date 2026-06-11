import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, Subject, takeUntil, tap, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';

import { environment } from '../../../../../environments/environment';
import { Config, ConfigServiceInterface } from '@shared/interfaces/config.interface';
import { UnifiedCacheService } from '@shared/services/unified-cache.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl: string;

  private configSubject = new BehaviorSubject<any>(null);
  private subscriptionModeSubject = new BehaviorSubject<boolean>(false);
  private groupsEnabledSubject = new BehaviorSubject<boolean>(true);
  private eventsEnabledSubject = new BehaviorSubject<boolean>(true);
  // Opt-in feature gated behind a server config flag; stays off until the config confirms it,
  // so the UI never mounts the nearby module nor calls /explore/* while it is disabled.
  private locationDiscoveryEnabledSubject = new BehaviorSubject<boolean>(false);

  private _unsubscribeAll = new Subject<void>();

  config$ = this.configSubject.asObservable();
  subscriptionMode$ = this.subscriptionModeSubject.asObservable();
  groupsEnabled$ = this.groupsEnabledSubject.asObservable();
  eventsEnabled$ = this.eventsEnabledSubject.asObservable();
  locationDiscoveryEnabled$ = this.locationDiscoveryEnabledSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socket: Socket,
    private cacheService: UnifiedCacheService,
  ) {
    this.subscribeToNotification();
    this.apiUrl = environment.API_URL;
  }

  configSnapshot(): any {
    return this.configSubject.value;
  }

  subscriptionModeSnapshot(): boolean {
    return this.subscriptionModeSubject.value;
  }

  getConfig(bypassCache: boolean = false): Observable<any> {
    const url = `${this.apiUrl}/config`;
    const params: any = {};
    if (bypassCache) {
      params._t = new Date().getTime();
    }
    return this.http.get<any>(url, { params }).pipe(
      tap((config) => this.applyConfigToSubjects(config)),
    );
  }

  // Single source of truth for pushing a config object to all derived subjects,
  // so updateConfig/setConfig/socket/getConfig all keep the feature-flag streams in sync.
  // Each flag is only updated when the incoming config explicitly contains it, so a partial
  // payload never resets a flag back to its default (e.g. a disabled flag staying visible).
  private applyConfigToSubjects(config: any): void {
    if (!config) return;
    this.configSubject.next(config);
    const settings = config?.settings ?? {};
    if (settings.subscriptionMode !== undefined) {
      this.subscriptionModeSubject.next(!!settings.subscriptionMode);
    }
    if (settings.groupsEnabled !== undefined) {
      this.groupsEnabledSubject.next(!!settings.groupsEnabled);
    }
    if (settings.eventsEnabled !== undefined) {
      this.eventsEnabledSubject.next(!!settings.eventsEnabled);
    }
    if (settings.locationDiscoveryEnabled !== undefined) {
      this.locationDiscoveryEnabledSubject.next(!!settings.locationDiscoveryEnabled);
    }
  }

  getConfigServices(): Observable<ConfigServiceInterface> {
    const url = `${this.apiUrl}/config/services`;
    return this.http.get<ConfigServiceInterface>(url);
  }

  updateConfig(config: Config): Observable<Config> {
    const url = `${this.apiUrl}/config`;
    return this.http.put<Config>(url, config).pipe(
      tap((updatedConfig) => {
        // Invalidate cache for config endpoint
        this.cacheService.clearByPattern(/config/);

        this.socket.emit('updateConfig', updatedConfig);
        this.applyConfigToSubjects(updatedConfig);
      })
    );
  }

  setConfig(config: any) {
    this.cacheService.clearByPattern(/config/);
    this.socket.emit('updateConfig', config);
    this.applyConfigToSubjects(config);
  }

  getSubscriptionMode(): Observable<boolean> {
    return this.http.get<{ subscriptionMode: boolean; plans: any[] }>(`${this.apiUrl}/config/subscription-mode`).pipe(
      map(res => res.subscriptionMode),
      tap(mode => this.subscriptionModeSubject.next(mode)),
    );
  }

  private subscribeToNotification() {
    this.socket.fromEvent('updateConfig')
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(error => {
          throw error;
        })
      )
      .subscribe((data: any) => {
        this.cacheService.clearByPattern(/config/);
        this.applyConfigToSubjects(data);
      });
  }
  groupsEnabledSnapshot(): boolean {
    return this.groupsEnabledSubject.value;
  }

  eventsEnabledSnapshot(): boolean {
    return this.eventsEnabledSubject.value;
  }

  locationDiscoveryEnabledSnapshot(): boolean {
    return this.locationDiscoveryEnabledSubject.value;
  }

  getLoginMethods(): Observable<{ email: boolean, google: boolean }> {
    return this.getConfig().pipe(
      map(config => {
        if (config?.settings?.loginMethods) {
          return JSON.parse(config.settings.loginMethods);
        }
        return { email: false, google: false };
      })
    );
  }

}

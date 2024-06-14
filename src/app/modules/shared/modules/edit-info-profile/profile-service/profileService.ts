import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    private _perfilActualizado = new BehaviorSubject<void>(undefined);
    perfilActualizado$: Observable<void> = this._perfilActualizado.asObservable();

    constructor() { }

    actualizarPerfil(): void {
        this._perfilActualizado.next();
    }
}


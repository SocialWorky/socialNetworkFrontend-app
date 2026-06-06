# AsyncPipe - Guía de Uso

El **AsyncPipe** es un pipe de Angular que se suscribe automáticamente a Observables y Promises, y maneja la desuscripción automáticamente cuando el componente se destruye.

## ¿Por Qué Usar AsyncPipe?

### Beneficios

✅ **Gestión automática de suscripciones**: No necesitas `subscribe()` ni `unsubscribe()`  
✅ **Prevención de memory leaks**: Angular se encarga de limpiar las suscripciones  
✅ **Código más limpio**: Menos boilerplate en el componente  
✅ **OnPush compatible**: Funciona perfectamente con `ChangeDetectionStrategy.OnPush`  
✅ **Menos errores**: No puedes olvidarte de desuscribirte  

### Cuándo Usar AsyncPipe

| Escenario | Usar AsyncPipe | Usar Subscribe Manual |
|-----------|----------------|----------------------|
| Mostrar datos en template | ✅ Sí | ❌ No |
| Lógica compleja en subscribe | ❌ No | ✅ Sí |
| Múltiples operaciones con los datos | ❌ No | ✅ Sí |
| Datos que solo se muestran | ✅ Sí | ❌ No |
| Necesitas el valor en el componente | ⚠️ Depende | ✅ Sí |

## Patrón Básico

### ❌ Antes (Subscribe Manual)

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '@shared/services/users.service';
import { User } from '@shared/models/user.model';

@Component({
  selector: 'app-user-profile',
  template: `
    <div *ngIf="user">
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>
    </div>
    <div *ngIf="loading">Cargando...</div>
  `
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  loading = false;
  private unsubscribe$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loading = true;
    this.userService.getUser('123')
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.loading = false;
        },
        error: (error) => {
          console.error(error);
          this.loading = false;
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
```

### ✅ Después (AsyncPipe)

```typescript
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { UserService } from '@shared/services/users.service';
import { User } from '@shared/models/user.model';

@Component({
  selector: 'app-user-profile',
  template: `
    <div *ngIf="user$ | async as user; else loading">
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>
    </div>
    <ng-template #loading>
      <div>Cargando...</div>
    </ng-template>
  `
})
export class UserProfileComponent implements OnInit {
  user$!: Observable<User>;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.user$ = this.userService.getUser('123');
  }
}
```

**Beneficios del cambio:**
- 🔥 **-15 líneas de código**
- ❌ **No más** `OnDestroy`, `unsubscribe$`, `takeUntil`
- ❌ **No más** gestión manual de `loading`
- ✅ **Más declarativo** y fácil de leer

## Patrones Comunes

### 1. Mostrar Lista de Datos

```typescript
@Component({
  selector: 'app-publication-list',
  template: `
    <div *ngFor="let pub of publications$ | async">
      <app-publication-card [publication]="pub"></app-publication-card>
    </div>
  `
})
export class PublicationListComponent {
  publications$ = this.publicationService.getPublications();
  
  constructor(private publicationService: PublicationService) {}
}
```

### 2. Combinar Múltiples Observables

```typescript
@Component({
  selector: 'app-dashboard',
  template: `
    <div *ngIf="data$ | async as data">
      <h1>{{ data.user.name }}</h1>
      <div>{{ data.stats.publications }} publicaciones</div>
    </div>
  `
})
export class DashboardComponent {
  data$ = combineLatest({
    user: this.userService.getCurrentUser(),
    stats: this.statsService.getUserStats()
  });
  
  constructor(
    private userService: UserService,
    private statsService: StatsService
  ) {}
}
```

### 3. Manejo de Estados (Loading, Error, Success)

```typescript
@Component({
  selector: 'app-user-list',
  template: `
    <ng-container *ngIf="users$ | async as users; else loading">
      <div *ngFor="let user of users">
        {{ user.name }}
      </div>
    </ng-container>
    
    <ng-template #loading>
      <app-loading-spinner></app-loading-spinner>
    </ng-template>
  `
})
export class UserListComponent {
  users$ = this.userService.getUsers().pipe(
    catchError(error => {
      console.error(error);
      return of([]); // Retornar array vacío en caso de error
    })
  );
  
  constructor(private userService: UserService) {}
}
```

### 4. Usar el Mismo Observable Múltiples Veces

⚠️ **Problema**: Usar `async` múltiples veces crea múltiples suscripciones

```typescript
// ❌ MAL: Hace 2 requests HTTP
<div>{{ (user$ | async)?.name }}</div>
<div>{{ (user$ | async)?.email }}</div>
```

✅ **Solución 1**: Usar `as` para almacenar el valor

```typescript
// ✅ BIEN: Hace 1 solo request
<div *ngIf="user$ | async as user">
  <div>{{ user.name }}</div>
  <div>{{ user.email }}</div>
</div>
```

✅ **Solución 2**: Usar `shareReplay` en el Observable

```typescript
user$ = this.userService.getUser('123').pipe(
  shareReplay(1) // Comparte la última emisión con todos los suscriptores
);

// Ahora puedes usar async múltiples veces sin problema
<div>{{ (user$ | async)?.name }}</div>
<div>{{ (user$ | async)?.email }}</div>
```

### 5. Actualizar Datos con Eventos

```typescript
@Component({
  selector: 'app-publication-feed',
  template: `
    <button (click)="refresh()">Actualizar</button>
    
    <div *ngFor="let pub of publications$ | async">
      {{ pub.content }}
    </div>
  `
})
export class PublicationFeedComponent {
  private refreshSubject = new Subject<void>();
  
  publications$ = this.refreshSubject.pipe(
    startWith(null), // Emitir inmediatamente al inicio
    switchMap(() => this.publicationService.getPublications())
  );
  
  constructor(private publicationService: PublicationService) {}
  
  refresh() {
    this.refreshSubject.next();
  }
}
```

## Ejemplo Real del Proyecto

### Componente de Mensajes (Antes)

```typescript
// messages.component.ts (ANTES)
export class MessagesComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  loading = false;
  private unsubscribe$ = new Subject<void>();

  ngOnInit() {
    this.loadConversations();
  }

  loadConversations() {
    this.loading = true;
    this._messageService.getConversations(this.page, this.pageSize)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (response) => {
          this.conversations = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error(error);
          this.loading = false;
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
```

### Componente de Mensajes (Después - Propuesto)

```typescript
// messages.component.ts (DESPUÉS)
export class MessagesComponent implements OnInit {
  conversations$ = this.loadConversations();

  constructor(private _messageService: MessageService) {}

  ngOnInit() {
    // El Observable se crea pero no se ejecuta hasta que el template se suscriba
  }

  private loadConversations() {
    return this._messageService.getConversations(this.page, this.pageSize).pipe(
      map(response => response.data),
      catchError(error => {
        console.error(error);
        return of([]);
      })
    );
  }

  refresh() {
    // Para refrescar, simplemente reasignar el Observable
    this.conversations$ = this.loadConversations();
  }
}
```

```html
<!-- messages.component.html (DESPUÉS) -->
<ng-container *ngIf="conversations$ | async as conversations; else loading">
  <app-conversation-item 
    *ngFor="let conv of conversations"
    [conversation]="conv">
  </app-conversation-item>
</ng-container>

<ng-template #loading>
  <app-loading-spinner></app-loading-spinner>
</ng-template>
```

## Cuándo NO Usar AsyncPipe

### 1. Necesitas el Valor en el Componente

```typescript
// ❌ NO usar AsyncPipe si necesitas el valor en el componente
loadUser() {
  this.userService.getUser('123').subscribe(user => {
    this.user = user;
    this.updateRelatedData(user); // Necesitas el valor aquí
    this.logUserActivity(user);   // Y aquí
  });
}
```

### 2. Lógica Compleja en el Subscribe

```typescript
// ❌ NO usar AsyncPipe para lógica compleja
this.publicationService.createPublication(data).subscribe({
  next: (publication) => {
    this.publications.unshift(publication);
    this.showSuccessMessage();
    this.trackAnalytics('publication_created');
    this.updateUserStats();
  },
  error: (error) => {
    this.handleError(error);
    this.showErrorMessage();
  }
});
```

### 3. Múltiples Operaciones Dependientes

```typescript
// ❌ NO usar AsyncPipe para operaciones en cadena
this.userService.getUser('123').subscribe(user => {
  this.publicationService.getUserPublications(user.id).subscribe(pubs => {
    this.commentService.getComments(pubs[0].id).subscribe(comments => {
      // Lógica compleja aquí
    });
  });
});

// ✅ Mejor usar switchMap y subscribe manual
this.userService.getUser('123').pipe(
  switchMap(user => this.publicationService.getUserPublications(user.id)),
  switchMap(pubs => this.commentService.getComments(pubs[0].id))
).subscribe(comments => {
  // Lógica aquí
});
```

## Mejores Prácticas

### 1. Convención de Nombres

```typescript
// ✅ BIEN: Usar sufijo $ para Observables
user$: Observable<User>;
publications$: Observable<Publication[]>;
loading$: Observable<boolean>;

// ❌ MAL: Sin sufijo
user: Observable<User>;
publications: Observable<Publication[]>;
```

### 2. Inicialización

```typescript
// ✅ BIEN: Inicializar en ngOnInit o en la declaración
export class MyComponent implements OnInit {
  data$ = this.dataService.getData();
  // O
  data$!: Observable<Data>;
  
  ngOnInit() {
    this.data$ = this.dataService.getData();
  }
}

// ❌ MAL: No inicializar
export class MyComponent {
  data$: Observable<Data>; // undefined!
}
```

### 3. Manejo de Errores

```typescript
// ✅ BIEN: Manejar errores en el Observable
data$ = this.dataService.getData().pipe(
  catchError(error => {
    console.error(error);
    return of(null); // O un valor por defecto
  })
);

// ❌ MAL: No manejar errores
data$ = this.dataService.getData(); // Error rompe el template
```

### 4. Performance con OnPush

```typescript
// ✅ EXCELENTE: Combinar AsyncPipe con OnPush
@Component({
  selector: 'app-my-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ data$ | async }}</div>`
})
export class MyComponent {
  data$ = this.dataService.getData();
}
```

## Migración Gradual

### Paso 1: Identificar Candidatos

Busca componentes con:
- ✅ `unsubscribe$` y `takeUntil`
- ✅ Datos que solo se muestran en el template
- ✅ Lógica simple de carga de datos

### Paso 2: Refactorizar Uno a la Vez

1. Cambiar la propiedad de tipo `T` a `Observable<T>`
2. Agregar sufijo `$` al nombre
3. Eliminar la suscripción manual
4. Actualizar el template para usar `async`
5. Eliminar `OnDestroy` si ya no es necesario

### Paso 3: Probar

- Verificar que los datos se cargan correctamente
- Verificar que no hay memory leaks (usar Chrome DevTools)
- Verificar que el componente se destruye correctamente

## Herramientas de Debug

### Verificar Suscripciones Activas

```typescript
// En el componente
ngOnDestroy() {
  console.log('Component destroyed');
  // Si ves este mensaje, las suscripciones se limpiaron
}
```

### Chrome DevTools

1. Abrir DevTools → Memory
2. Tomar heap snapshot
3. Navegar entre páginas
4. Tomar otro snapshot
5. Comparar para detectar memory leaks

## Recursos Adicionales

- [Angular AsyncPipe Documentation](https://angular.io/api/common/AsyncPipe)
- [RxJS shareReplay](https://rxjs.dev/api/operators/shareReplay)
- [Change Detection Strategy](https://angular.io/api/core/ChangeDetectionStrategy)

## Resumen

| Aspecto | Subscribe Manual | AsyncPipe |
|---------|------------------|-----------|
| **Código** | Más verbose | Más conciso |
| **Memory Leaks** | Riesgo alto | Riesgo bajo |
| **Boilerplate** | Mucho | Poco |
| **Flexibilidad** | Alta | Media |
| **Performance** | Buena | Excelente (con OnPush) |
| **Complejidad** | Permite lógica compleja | Solo para mostrar datos |

**Recomendación**: Usa AsyncPipe siempre que sea posible para datos que se muestran en el template. Usa subscribe manual solo cuando necesites lógica compleja o el valor en el componente.

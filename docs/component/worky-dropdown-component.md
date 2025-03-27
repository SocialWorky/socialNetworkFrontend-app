# WorkyDropdownComponent

El `WorkyDropdownComponent` se utiliza para crear un menú desplegable personalizado que puede contener enlaces y avatares de usuario. Este componente es altamente configurable y permite manejar eventos de clic en los elementos del menú.

## Propiedades de Entrada (Inputs)

- icon (opcional): Define el icono que se mostrará en el dropdown.
- badge : Indica si se debe mostrar un badge en el icono. Valor por defecto es false .
- badgeValue : Valor numérico del badge. Por defecto es 0 .
- dataLink : Array de objetos DropdownDataLink que define los enlaces del menú.
- img : Define si se debe mostrar un avatar de usuario. Puede ser una URL o el string 'avatar' .
- size (opcional): Tamaño del avatar o icono. Valor por defecto es 50 .
- title (opcional): Título del dropdown.
- isFilled (opcional): Indica si el icono del dropdown debe estar solido. Valor por defecto es false .

## Propiedades de Salida (Outputs)

- linkClicked : Evento emitido cuando se hace clic en un enlace del menú.

## Métodos

- handleMenuItemClick(data: DropdownDataLink) : Método interno que maneja el evento de clic en los elementos del menú y emite linkClicked .

## Uso

primero importa el componente en tu módulo:

```typescript
import { WorkyDropdownModule } from '../worky-dropdown/worky-dropdown.module';
@NgModule({
  declarations: [
    //...
  ],
  imports: [
    //...
    WorkyDropdownModule,
  ],
  //...
})
```

Para utilizar el `WorkyDropdownComponent`, primero incluyes en tu plantilla HTML:

```html
<worky-dropdown
  [icon]="more_horiz"
  [badge]="true"
  [badgeValue]="5"
  [dataLink]="links"
  [img]="avatar"
  [size]="40"
  [title]="'Opciones'"
  [isFilled]="true"
  (linkClicked)="onLinkClicked($event)">
</worky-dropdown>

<!-- Ejemplo clásico y común de uso -->

  <worky-dropdown
    icon="more_horiz"
    [badge]=false
    (click)="checkDataLink(publication.author._id)"
    [dataLink]="dataLinkActions"
    (linkClicked)="handleActionsClicked($event, publication)">
  </worky-dropdown>

```

## Ejemplo de Uso

En tu componente TypeScript, puedes definir los enlaces del menú y manejar el evento linkClicked:

```typescript
import { Component } from '@angular/core';
@Component({
  selector: 'app-ejemplo-dropdown',
  templateUrl: './ejemplo-dropdown.component.html',
  styleUrls: ['./ejemplo-dropdown.component.scss']
})
export class EjemploDropdownComponent {

  dataLinkActions: DropdownDataLink<any>[] = [];

  checkDataLink(userId: string) {
    this.dataLinkActions = [];
    this.menuActions();
    const menuDeletePublications = {
      icon: 'delete',
      function: this.deletePublications.bind(this),
      title: translations['publicationsView.deletePublication'],
      color: Colors.RED
    };
    const menuFixedPublications = {
      icon: 'push_pin',
      function: this.fixedPublications.bind(this),
      title: !this.publication.fixed ? translations['publicationsView.fixedPublication'] : translations['publicationsView.unfixedPublication'],
      color: this.publication.fixed ? Colors.RED : Colors.BLUE
    };

    if (userId === this.dataUser?.id || this.dataUser?.role === RoleUser.ADMIN) {

      if (this.publication.fixed) {
        if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.unfixedPublication'])) {
          this.dataLinkActions.push(menuFixedPublications);
        }
      } else {
        if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.fixedPublication'])) {
          this.dataLinkActions.push(menuFixedPublications);
        }
      }

      if (!this.dataLinkActions.find((element) => element.title === translations['publicationsView.deletePublication'])) {
        this.dataLinkActions.push(menuDeletePublications);
      }
    }
    this._cdr.markForCheck();
  }

  handleActionsClicked(data: DropdownDataLink<any>, publication: any) {
    if (data.function && typeof data.function === 'function') {
      data.function(publication);
    } else if (data.link) {
      this._router.navigate([data.link]);
    } else if (data.linkUrl) {
      const newLink = data.linkUrl + '/publication/' + publication._id + '/';
      window.open(newLink, '_blank');
    }
  }

}

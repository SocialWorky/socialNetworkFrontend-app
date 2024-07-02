import { Component, OnInit } from '@angular/core';

import { routes } from '@admin/admin-routing.module';
import { AuthService } from '@auth/services/auth.service';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-admin-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrls: ['./sidemenu.component.scss'],
})
export class SidemenuComponent  implements OnInit {

  title: string = translations['admin.sidemenu-title'];

  subTitle: string = translations['admin.sidemenu-subTitle'];

  userName: string = 'Admin';

  public menuItems = routes
    .map((route) => route.children ?? [])
    .flat()
    .filter((route) => route && route.path)
    .filter((route) => !route.path?.includes(':'));

  constructor(private _authService: AuthService) { }

  ngOnInit() {
    const token = this._authService.getDecodedToken()!;
    this.userName = token?.name;
  }

  logout() {
    this._authService.logout();
  }

}

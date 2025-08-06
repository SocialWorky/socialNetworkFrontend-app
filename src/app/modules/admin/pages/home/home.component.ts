import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'worky-admin-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeAdminComponent  implements OnInit {

  token = localStorage.getItem('token');

  constructor(private _router: Router) { 
    if (!this.token) {
      this._router.navigate(['/login']);
    }
 }

  ngOnInit() {}

}

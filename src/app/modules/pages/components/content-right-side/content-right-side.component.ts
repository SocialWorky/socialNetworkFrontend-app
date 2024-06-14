import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'worky-content-right-side',
  templateUrl: './content-right-side.component.html',
  styleUrls: ['./content-right-side.component.scss'],
})
export class ContentRightSideComponent implements OnInit {

  rutaUrl: string = '';

  constructor(private _router: Router) {}

  ngOnInit(): void {
    this.rutaUrl = this._router.url;
  }
}

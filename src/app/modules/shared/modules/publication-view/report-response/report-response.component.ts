import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { WorkyButtonType, WorkyButtonTheme } from '@shared/modules/buttons/models/worky-button-model';

@Component({
    selector: 'worky-report-response',
    templateUrl: './report-response.component.html',
    styleUrls: ['./report-response.component.scss'],
    standalone: false
})
export class ReportResponseComponent  implements OnInit {

  WorkyButtonType = WorkyButtonType;
  
  WorkyButtonTheme = WorkyButtonTheme;

  createReportForm: FormGroup;

  constructor( 
    private _fb: FormBuilder,
    private _dialogRef: MatDialogRef<ReportResponseComponent>,
  ) {
    this.createReportForm = this._fb.group({
      detail_report: ['', Validators.required],
    });   
  }

  ngOnInit() {}

  closeReport() {
    console.log('close report');
  }

  createReport() {
    const detailReport = this.createReportForm.get('detail_report')?.value;
    this._dialogRef.close(detailReport);
  }

}

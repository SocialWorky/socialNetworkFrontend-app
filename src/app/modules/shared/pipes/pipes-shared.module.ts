import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyDatePipe } from './dateFormat.pipe';
import { WorkyPreviewHtmlPipe } from './preview-html.pipe';
import { WorkyProcessContentPipe } from './process-content.pipe';

@NgModule({
  declarations: [WorkyDatePipe, WorkyPreviewHtmlPipe, WorkyProcessContentPipe],
  imports: [
    CommonModule
  ],
  exports: [WorkyDatePipe, WorkyPreviewHtmlPipe, WorkyProcessContentPipe]

})
export class PipesSharedModule { }

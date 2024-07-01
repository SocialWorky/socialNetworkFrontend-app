import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkyDateFormatPipe } from './dateFormat.pipe';
import { WorkyPreviewHtmlPipe } from './preview-html.pipe';
import { WorkyProcessContentPipe } from './process-content.pipe';
import { WorkyRelativeTimePipe } from './relative-time.pipe';

@NgModule({
  declarations: [WorkyDateFormatPipe, WorkyPreviewHtmlPipe, WorkyProcessContentPipe, WorkyRelativeTimePipe],
  imports: [
    CommonModule
  ],
  exports: [WorkyDateFormatPipe, WorkyPreviewHtmlPipe, WorkyProcessContentPipe, WorkyRelativeTimePipe]

})
export class PipesSharedModule { }

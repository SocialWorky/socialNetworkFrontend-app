import { Component, Input, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WidgetConfig } from '../worky-news/interface/widget.interface';

@Component({
  selector: 'worky-dynamic-widget',
  templateUrl: './dynamic-widget.component.html',
  styleUrls: ['./dynamic-widget.component.scss'],
  imports: [CommonModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicWidgetComponent implements OnInit {
  @Input() widget!: WidgetConfig;
  
  safeHtml: SafeHtml = '';
  widgetType: string = '';

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.widget) {
      this.widgetType = this.widget.type || 'custom';
      this.renderWidget();
    }
  }

  private renderWidget(): void {
    const config = this.widget.config || {};

    switch (this.widgetType) {
      case 'html':
        this.renderHtmlWidget(config);
        break;
      case 'image':
        this.renderImageWidget(config);
        break;
      case 'text':
        this.renderTextWidget(config);
        break;
      case 'list':
        this.renderListWidget(config);
        break;
      case 'link':
        this.renderLinkWidget(config);
        break;
      case 'iframe':
        this.renderIframeWidget(config);
        break;
      default:
        this.renderCustomWidget(config);
    }

    this.cdr.markForCheck();
  }

  private renderHtmlWidget(config: any): void {
    const htmlContent = config.htmlContent || '';
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  private renderImageWidget(config: any): void {
    const imageUrl = config.imageUrl || '';
    const altText = config.altText || '';
    const linkUrl = config.linkUrl || '';
    const title = config.title || '';
    const showTitle = this.shouldShowTitle();

    let html = '';
    if (title && showTitle) {
      html += `<h3 class="dynamic-widget-title">${this.escapeHtml(title)}</h3>`;
    }
    
    if (linkUrl) {
      html += `<a href="${this.escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="dynamic-widget-image-link">`;
    }
    
    html += `<img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(altText)}" class="dynamic-widget-image" loading="lazy">`;
    
    if (linkUrl) {
      html += `</a>`;
    }

    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private renderTextWidget(config: any): void {
    const title = config.title || '';
    const content = config.content || '';
    const showTitle = this.shouldShowTitle();

    let html = '';
    if (title && showTitle) {
      html += `<h3 class="dynamic-widget-title">${this.escapeHtml(title)}</h3>`;
    }
    html += `<div class="dynamic-widget-content">${this.formatText(content)}</div>`;

    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private renderListWidget(config: any): void {
    const title = config.title || '';
    const showTitle = this.shouldShowTitle();
    let links: any[] = [];

    try {
      if (typeof config.links === 'string') {
        links = JSON.parse(config.links);
      } else if (Array.isArray(config.links)) {
        links = config.links;
      }
    } catch (e) {
      links = [];
    }

    let html = '';
    if (title && showTitle) {
      html += `<h3 class="dynamic-widget-title">${this.escapeHtml(title)}</h3>`;
    }
    
    if (links.length > 0) {
      html += `<ul class="dynamic-widget-list">`;
      links.forEach(link => {
        const label = link.label || link.text || '';
        const url = link.url || link.href || '#';
        html += `<li><a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(label)}</a></li>`;
      });
      html += `</ul>`;
    }

    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private renderLinkWidget(config: any): void {
    const label = config.label || config.text || '';
    const url = config.url || config.href || '#';
    const icon = config.icon || '';

    let html = '';
    if (icon) {
      html += `<i class="material-icons">${this.escapeHtml(icon)}</i> `;
    }
    html += `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="dynamic-widget-link">${this.escapeHtml(label)}</a>`;

    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private renderIframeWidget(config: any): void {
    const url = config.url || '';
    const height = config.height || '400px';
    const width = config.width || '100%';

    if (url) {
      const html = `<iframe src="${this.escapeHtml(url)}" width="${this.escapeHtml(width)}" height="${this.escapeHtml(height)}" frameborder="0" allowfullscreen class="dynamic-widget-iframe"></iframe>`;
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    }
  }

  private renderCustomWidget(config: any): void {
    const htmlContent = config.htmlContent || config.content || '';
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatText(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  private shouldShowTitle(): boolean {
    // Check if showTitle is explicitly set in config, default to true
    if (this.widget.config && this.widget.config.hasOwnProperty('showTitle')) {
      return this.widget.config['showTitle'] !== false;
    }
    // Default to showing title if not specified
    return true;
  }
}

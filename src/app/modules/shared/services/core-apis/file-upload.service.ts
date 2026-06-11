import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { forkJoin, of, throwError, timer, Observable } from 'rxjs';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(
    private http: HttpClient,
    private _authService: AuthService,
    private _logService: LogService
  ) { }

  // The Cloudflare edge caps each request body at ~100MB. Sending every file in a single
  // multipart POST made multi-video uploads exceed that and get a 413 BEFORE reaching the
  // file-service (so nothing was stored). We now send ONE request per file — each stays under
  // the limit — and merge the responses. `totalFiles` is forwarded so the backend can still
  // batch the completion notification across the per-file requests.
  uploadFile(
    files: File[],
    destination: string,
    idReference?: string | null,
    urlMedia?: string | null,
    type?: TypePublishing | null
  ): Observable<any> {
    const url = `${environment.APIFILESERVICE}upload`;
    const id = this._authService.getDecodedToken()?.id;
    const uniqueFiles = this.getUniqueFiles(files);

    if (uniqueFiles.length === 0) {
      return of({ message: 'No files to upload.', files: [] });
    }

    const totalFiles = uniqueFiles.length;

    const requests = uniqueFiles.map((file) => {
      const formData = new FormData();
      formData.append('userId', `${id}`);
      formData.append('destination', destination);
      if (idReference) formData.append('idReference', idReference);
      if (urlMedia) formData.append('urlMedia', urlMedia);
      if (type) formData.append('type', type);
      formData.append('totalFiles', `${totalFiles}`);
      formData.append('files', file);

      return this.http.post<any>(url, formData).pipe(
        // Videos are large/slow to upload over the tunnel; 60s was too tight.
        timeout(180000),
        retry({
          count: 2,
          delay: (error, attempt) => {
            if (error?.status >= 400 && error?.status < 500) {
              return throwError(() => error);
            }
            return timer(attempt * 1000);
          },
        }),
        catchError(error => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'FileUploadService',
            'File upload failed after retries',
            { error, fileName: file.name, fileSizeBytes: file.size }
          );
          // Don't let one failed file abort the others — surface it as a null result.
          return of(null);
        })
      );
    });

    return forkJoin(requests).pipe(
      map((responses) => {
        const ok = responses.filter((r) => r !== null);
        return {
          message: ok[0]?.message ?? 'No files uploaded.',
          files: ok.flatMap((r) => r?.files ?? []),
          failedCount: responses.length - ok.length,
        };
      })
    );
  }

  private getUniqueFiles(files: File[]): File[] {
    const uniqueFilesMap = new Map<string, File>();

    files.forEach(file => {
      const fileKey = `${file.name}-${file.size}`;
      if (!uniqueFilesMap.has(fileKey)) {
        uniqueFilesMap.set(fileKey, file);
      }
    });

    return Array.from(uniqueFilesMap.values());
  }

  saveUrlFile(
    url: string,
    urlThumbnail: string,
    urlCompressed: string,
    _idPublications: string,
    type: TypePublishing,
    extras?: {
      urlThumbnailWebP?: string;
      urlPreview?: string;
      urlPreviewWebP?: string;
      urlCompressedWebP?: string;
      urlFull?: string;
      urlFullWebP?: string;
      blurHash?: string;
    }
  ) {
    const urlApi = environment.API_URL;

    const body = {
      url,
      urlThumbnail,
      urlCompressed,
      _idPublication: _idPublications,
      isPublications: type === TypePublishing.POST,
      isComment: type === TypePublishing.COMMENT,
      ...extras,
    };

    return this.http.post<any>(`${urlApi}/media/create`, body);
  }
}

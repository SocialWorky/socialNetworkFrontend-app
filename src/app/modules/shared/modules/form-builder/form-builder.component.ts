import { Component, ChangeDetectorRef, OnInit, Renderer2, OnDestroy } from '@angular/core';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormGroup, FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { forkJoin, map, Observable, Subject, Subscription, takeUntil } from 'rxjs';

import { Field } from './interfaces/field.interface';
import { CustomFieldType, CustomFieldDestination, CustomField} from './interfaces/custom-field.interface';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { AuthService } from '@auth/services/auth.service';
import { translations } from '@translations/translations';

@Component({
    selector: 'worky-form-builder',
    templateUrl: './form-builder.component.html',
    styleUrls: ['./form-builder.component.scss'],
    standalone: false
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  form: FormGroup = new FormGroup({});

  selectedField: Field | null = null;

  idError = false;

  selectedFieldIndex: number | null = null;

  formDestination: CustomFieldDestination = CustomFieldDestination.PROFILE;

  enumCustomFieldType = CustomFieldType;

  availableFields: Field[] = [
    { type: CustomFieldType.TEXT, id: this.generateId(), idName: '', label: translations['formBuilder.textField'], destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.TEXTAREA, id: this.generateId(), idName: '', label: translations['formBuilder.textArea'], destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.SELECT, id: this.generateId(), idName: '', label: translations['formBuilder.selectField'], options: [], destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.LOCATION, id: this.generateId(), idName: '', label: translations['formBuilder.locationField'], destination: CustomFieldDestination.PROFILE },
  ];

  formFields: Field[] = [];

  customFieldDestinations = Object.values(CustomFieldDestination);

  destinationLabels = {
    [CustomFieldDestination.PROFILE]: translations['formBuilder.destination.profile'],
    [CustomFieldDestination.REGISTRATION]: translations['formBuilder.destination.register']
  };

  private destroy$ = new Subject<void>();
  private cascadeSubs: Subscription[] = [];

  // Persisted fields removed in the UI but not yet deleted on the backend.
  // Applied atomically when the form is saved.
  private deletedIds: string[] = [];

  constructor(
    private _cdr: ChangeDetectorRef,
    private _renderer: Renderer2,
    private _customFieldService: CustomFieldService,
    private _logService: LogService,
    private _authService: AuthService
  ) { }

  ngOnInit() {
    this.formDestination = this.customFieldDestinations[0];
    this.form = new FormGroup({
      id: new FormControl(''),
      idName: new FormControl(''),
      label: new FormControl(''),
      isActive: new FormControl(false),
      placeholder: new FormControl(''),
      optionsString: new FormControl(''),
      destination: new FormControl(CustomFieldDestination.PROFILE),
      additionalOptions: new FormGroup({
        multiSelect: new FormControl(false),
        visible: new FormControl(true),
        required: new FormControl(false),
        showInProfileDetail: new FormControl(true),
        minLength: new FormControl(0),
        maxLength: new FormControl(50)
      })
    });

    setTimeout(() => {
      this.getFields();
    }, 100);

    this._cdr.markForCheck();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getFields(): void {
    this._customFieldService.getCustomFields().pipe(
      takeUntil(this.destroy$),
      map((fields: any) => fields.filter((field: Field) => field.destination === this.formDestination))
    ).subscribe((filteredFields: any[]) => {
      this.formFields = filteredFields.map((field: any) => {
        if (!this.form.get(field.id)) {
          this.form.addControl(field.id, new FormControl(''));
        }
        return {
          id: field.id,
          index: field.index,
          idName: field.idName,
          type: field.type,
          label: field.label,
          isActive: field.isActive,
          options: field.options?.choices || [],
          required: field.options?.required,
          placeholder: field.options?.placeholder,
          destination: field.destination,
          cascade: field.options?.cascade,
          additionalOptions: {
            multiSelect: field.options?.multiSelect || false,
            visible: field.options?.visible ?? true,
            required: field.options?.required || false,
            showInProfileDetail: field.options?.showInProfileDetail ?? true,
            minLength: field.options?.minLength || 0,
            maxLength: field.options?.maxLength || 50
          }
        };
      });
      this.setupCascadePreview();
      this._cdr.markForCheck();
    });
  }

  /** Build the persisted payload for a single field. */
  private buildFieldPayload(field: Field, index: number): any {
    return {
      index,
      idName: field.idName,
      type: field.type,
      label: field.label || '',
      isActive: true,
      options: {
        multiSelect: field.additionalOptions?.multiSelect || false,
        required: field.additionalOptions?.required || false,
        placeholder: field.placeholder,
        minLength: field.additionalOptions?.minLength || 0,
        maxLength: field.additionalOptions?.maxLength || 50,
        visible: field.additionalOptions?.visible ?? true,
        showInProfileDetail: field.additionalOptions?.showInProfileDetail ?? true,
        choices: field.options || [],
        ...(field.cascade?.dependsOn ? { cascade: field.cascade } : {}),
      },
      destination: field.destination,
    };
  }

  // Saving a field's config persists ONLY that field — not every field — to avoid a
  // burst of PATCH requests (which tripped the token-refresh race and 401'd the session).
  updateFieldOptions(field: Field, index: number) {
    field.index = index;
    field.destination = this.formDestination;

    if (this.isIdValidLocalId(field.id)) {
      // Not yet persisted — it is created on "Guardar Formulario".
      this.selectField(field, index);
      return;
    }

    this._customFieldService
      .updateCustomField(field.id, this.buildFieldPayload(field, index))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectField(field, index);
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'FormBuilderComponent',
            'Error al actualizar campo',
            { message: error },
          );
        },
      });
  }

  onDragStart(event: CdkDragStart) {
    this._renderer.addClass(document.body, 'dragging-global');
  }

  onDragEnd(event: CdkDragEnd) {
    this._renderer.removeClass(document.body, 'dragging-global');
  }

  validateId() {
    this.idError = this.formFields.some(field => field.id === this.selectedField?.id && field !== this.selectedField);
  }

  updateOptions(): void {
    const optionsString = this.form.get('optionsString')?.value;
    if (optionsString && this.selectedField) {
      this.selectedField.options = optionsString.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }));
      const optionsControl = this.form.get('optionsString');
      if (optionsControl && this.selectedField.options) {
        optionsControl.setValue(this.selectedField.options.map(opt => opt.label).join(', '));
      }
    }
  }

  // ----- Cascading (dependent) options -----

  /** Select fields (with an idName) that can act as the parent of a cascade. */
  get cascadeParents(): Field[] {
    return this.formFields.filter(
      (f) =>
        f.type === CustomFieldType.SELECT &&
        !!f.idName &&
        f.id !== this.selectedField?.id,
    );
  }

  /** The option values of a parent field, used to build the per-value editor. */
  parentChoices(parentIdName?: string): { value: string; label: string }[] {
    if (!parentIdName) return [];
    const parent = this.formFields.find((f) => f.idName === parentIdName);
    if (!parent) return [];

    // If the parent is itself a cascading field (e.g. Region depends on Country),
    // its possible values are the union of every per-parent option set — so the
    // child (e.g. City) can define options for each one (multi-level cascade).
    if (parent.cascade?.dependsOn && parent.cascade.optionsByParent) {
      const seen = new Set<string>();
      const all: { value: string; label: string }[] = [];
      Object.values(parent.cascade.optionsByParent).forEach((choices) => {
        (choices || []).forEach((c) => {
          if (!seen.has(c.value)) {
            seen.add(c.value);
            all.push(c);
          }
        });
      });
      return all;
    }

    return (parent.options as { value: string; label: string }[]) || [];
  }

  setCascadeParent(event: MatSelectChange) {
    if (!this.selectedField) return;
    const parentIdName = event.value as string;
    if (!parentIdName) {
      this.selectedField.cascade = undefined;
    } else {
      this.selectedField.cascade = {
        dependsOn: parentIdName,
        optionsByParent:
          this.selectedField.cascade?.dependsOn === parentIdName
            ? this.selectedField.cascade.optionsByParent
            : {},
      };
    }
    this.syncSelectedField();
  }

  cascadeOptionsString(parentValue: string): string {
    const opts = this.selectedField?.cascade?.optionsByParent?.[parentValue] || [];
    return opts.map((o) => o.label).join(', ');
  }

  setCascadeOptions(parentValue: string, event: Event) {
    if (!this.selectedField?.cascade) return;
    const value = (event.target as HTMLInputElement).value;
    const choices = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));
    this.selectedField.cascade.optionsByParent = {
      ...(this.selectedField.cascade.optionsByParent || {}),
      [parentValue]: choices,
    };
    this.syncSelectedField();
  }

  private syncSelectedField() {
    const idx = this.formFields.findIndex(
      (f) => f.id === this.selectedField?.id,
    );
    if (idx !== -1 && this.selectedField) {
      this.formFields[idx] = this.selectedField;
    }
    this.setupCascadePreview();
    this._cdr.markForCheck();
  }

  /** Indentation depth of a field within its cascade chain (0 = no parent). */
  cascadeDepth(field: Field): number {
    let depth = 0;
    let current: Field | undefined = field;
    const seen = new Set<string>();
    while (current?.cascade?.dependsOn && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = this.formFields.find(
        (f) => f.idName === current!.cascade!.dependsOn,
      );
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  }

  // Live preview of the cascade inside the builder: selecting a parent value
  // populates its dependent child's options, so the admin can see the behavior.
  private setupCascadePreview(): void {
    this.cascadeSubs.forEach((s) => s.unsubscribe());
    this.cascadeSubs = [];

    this.formFields.forEach((child) => {
      const dependsOn = child.cascade?.dependsOn;
      if (!dependsOn) return;
      const parent = this.formFields.find((f) => f.idName === dependsOn);
      if (!parent) return;
      const parentControl = this.form.get(parent.id);
      if (!parentControl) return;

      this.applyCascadeChild(child, parentControl.value);
      const sub = parentControl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((val) => this.applyCascadeChild(child, val));
      this.cascadeSubs.push(sub);
    });
  }

  private applyCascadeChild(child: Field, parentValue: any): void {
    child.options = child.cascade?.optionsByParent?.[parentValue] || [];
    // Reset the child's own value (emitting so any grandchild resets too).
    const ctrl = this.form.get(child.id);
    if (ctrl && ctrl.value) {
      ctrl.setValue('', { emitEvent: true });
    }
    this._cdr.markForCheck();
  }

  updateField(field: Field, property: keyof Field, event: Event | MatSelectChange) {

    if (!field.additionalOptions) {
      field.additionalOptions = {
        multiSelect: false,
        visible: true,
        required: false,
        minLength: 0,
        maxLength: 50
      };
    }

    let value: any;

    if (event instanceof MatSelectChange) {
      value = event.value;
    } else {
      const input = event.target as HTMLInputElement;
      value = input.value;
    }

    const index = this.formFields.findIndex(f => f.id === field.id);

    if (index !== -1) {
      const updatedField = { ...field };

      if (property === 'visible' || property === 'required' || property === 'multiSelect' || property === 'showInProfileDetail') {
        updatedField.additionalOptions = {
          ...updatedField.additionalOptions,
          [property]: value
        };
      } else if (property === 'minLength' || property === 'maxLength') {
        updatedField.additionalOptions = {
          ...updatedField.additionalOptions,
          [property]: Number(value)
        };
      } else {
        updatedField[property] = value;
      }

      this.formFields[index] = updatedField;
      this.selectedField = updatedField;

      this._cdr.markForCheck();
    }
  }

  drop(event: CdkDragDrop<Field[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this._cdr.markForCheck();
      return;
    }

    const copiedItem: Field = {
      ...event.previousContainer.data[event.previousIndex],
      id: this.generateId(),
      isActive: false,
      additionalOptions: event.previousContainer.data[event.previousIndex].additionalOptions || {
        multiSelect: false,
        visible: true,
        required: false,
        minLength: 0,
        maxLength: 50,
      },
    };
    this.form.addControl(copiedItem.id, new FormControl(''));
    event.container.data.splice(event.currentIndex, 0, copiedItem);
    this._cdr.markForCheck();
    // The field is persisted (created) atomically on "Guardar Formulario", together
    // with any deletions and edits — see saveForm(). Keeping drop local avoids the
    // create/delete/reload races that duplicated or resurrected fields.
  }

  generateId(): string {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return `_${uuid}`;
  }

  isIdValidLocalId(id: string): boolean {
    return id.startsWith('_');
  }

  deleteField(field: Field, index: number) {
    // Defer the backend delete to saveForm so it is applied atomically with the
    // reload — deleting fire-and-forget here raced with getFields() and the field
    // reappeared. Local (never-persisted) fields are simply discarded.
    if (!this.isIdValidLocalId(field.id)) {
      this.deletedIds.push(field.id);
    }
    this.form.removeControl(field.id);
    this.formFields.splice(index, 1);
    if (this.selectedFieldIndex === index) {
      this.selectedField = null;
      this.selectedFieldIndex = null;
    }
    this._cdr.markForCheck();
  }

  selectField(field: Field, index: number) {

    if (!field.additionalOptions) {
      field.additionalOptions = {
        multiSelect: false,
        visible: true,
        required: false,
        showInProfileDetail: true,
        minLength: 0,
        maxLength: 50
      };
    }

    if (this.selectedField && this.selectedFieldIndex === index) {
      this.selectedField = null;
      this.selectedFieldIndex = -1;

      this.form.reset();
    } else {
      this.selectedField = field;
      this.selectedFieldIndex = index;

      this.form.patchValue({
        id: field.id,
        idName: field.idName,
        label: field.label || '',
        placeholder: field.placeholder,
        optionsString: field.options && Array.isArray(field.options) ? field.options.map((o: { label: any; }) => o.label).join(', ') : '',
        destination: field.destination || CustomFieldDestination.PROFILE,
        additionalOptions: {
          multiSelect: field.additionalOptions?.multiSelect || false,
          visible: field.additionalOptions?.visible || true,
          required: field.additionalOptions?.required || false,
          showInProfileDetail: field.additionalOptions?.showInProfileDetail ?? true,
          minLength: field.additionalOptions?.minLength || 0,
          maxLength: field.additionalOptions?.maxLength || 50
        }
      });
    }

    this._cdr.markForCheck();
  }

  onInputChange(event: Event) {
    const inputElement = event.target as HTMLInputElement | null;
    if (inputElement) {
      const value = inputElement.value;
    }
  }

  updateFormDestination(event: MatSelectChange) {
    this.formDestination = event.value;
    this.getFields();
  }

  saveForm() {
    if (!this.hasValidField()) {
      return;
    }

    this.formFields.forEach((field, index) => {
      field.index = index;
      field.destination = this.formDestination;
    });

    // Apply EVERYTHING atomically: delete removed fields, create new (local) ones,
    // update existing ones — then reload once. A single forkJoin barrier guarantees
    // the reload sees the final server state, so nothing reappears or goes missing.
    const operations: Observable<any>[] = [
      ...this.deletedIds.map((id) => this._customFieldService.deleteCustomField(id)),
      ...this.formFields.map((field, index) =>
        this.isIdValidLocalId(field.id)
          ? this._customFieldService.createCustomField(this.buildFieldPayload(field, index))
          : this._customFieldService.updateCustomField(field.id, this.buildFieldPayload(field, index)),
      ),
    ];

    const reload = () => {
      this.deletedIds = [];
      this.getFields();
      this._cdr.markForCheck();
    };

    if (operations.length === 0) {
      reload();
      return;
    }

    forkJoin(operations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: reload,
        error: (error) => {
          this._logService.log(
            LevelLogEnum.ERROR,
            'FormBuilderComponent',
            'Error al guardar formulario',
            { message: error },
          );
        },
      });
  }

  hasValidField(): boolean {
    return this.formFields.length > 0 && this.formFields.some(field => {
      return field.label && field.id;
    });
  }
}

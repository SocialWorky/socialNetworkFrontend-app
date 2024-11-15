import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilderComponent } from './form-builder.component';
import { CustomFieldService } from '@shared/services/custom-field.service';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { of, throwError } from 'rxjs';
import { CustomFieldDestination, CustomFieldType } from './interfaces/custom-field.interface';
import { MatSelectChange } from '@angular/material/select';
import { Field } from './interfaces/field.interface';

describe('FormBuilderComponent', () => {
  let component: FormBuilderComponent;
  let fixture: ComponentFixture<FormBuilderComponent>;
  let customFieldService: jasmine.SpyObj<CustomFieldService>;

  const mockFields = [
    {
      id: '1',
      type: CustomFieldType.TEXT,
      label: 'Campo de prueba',
      idName: 'test_field',
      isActive: true,
      destination: CustomFieldDestination.PROFILE,
      options: {
        placeholder: 'Test',
        choices: [],
        multiSelect: false,
        visible: true,
        required: false,
        minLength: 0,
        maxLength: 50
      }
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('CustomFieldService', [
      'getCustomFields',
      'createCustomField',
      'updateCustomField',
      'deleteCustomField'
    ]);
    spy.getCustomFields.and.returnValue(of(mockFields));
    spy.createCustomField.and.returnValue(of({}));
    spy.updateCustomField.and.returnValue(of({}));
    spy.deleteCustomField.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [ FormBuilderComponent ],
      imports: [
        ReactiveFormsModule,
        DragDropModule
      ],
      providers: [
        { provide: CustomFieldService, useValue: spy }
      ]
    }).compileComponents();

    customFieldService = TestBed.inject(CustomFieldService) as jasmine.SpyObj<CustomFieldService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FormBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario en ngOnInit', () => {
    component.ngOnInit();
    expect(component.form instanceof FormGroup).toBeTruthy();
    expect(component.formDestination).toBe(CustomFieldDestination.PROFILE);
  });

  it('debe cargar campos al inicializar', fakeAsync(() => {
    component.ngOnInit();
    tick(100);
    
    expect(customFieldService.getCustomFields).toHaveBeenCalled();
    expect(component.formFields.length).toBe(1);
    expect(component.formFields[0].label).toBe('Campo de prueba');
  }));

  it('debe generar un ID válido', () => {
    const id = component.generateId();
    expect(id.startsWith('_')).toBeTruthy();
    expect(id.length).toBe(37); // '_' + 36 characters UUID
  });

  it('debe validar ID local correctamente', () => {
    expect(component.isIdValidLocalId('_123')).toBeTruthy();
    expect(component.isIdValidLocalId('123')).toBeFalsy();
  });

  it('debe seleccionar y deseleccionar un campo', () => {
    const mockField = {
      id: '1',
      type: CustomFieldType.TEXT,
      label: 'Test',
      idName: 'test',
      destination: CustomFieldDestination.PROFILE
    };

    // Selectional campo
    component.selectField(mockField, 0);
    expect(component.selectedField).toEqual(mockField);
    expect(component.selectedFieldIndex).toBe(0);

    // Deselection campo
    component.selectField(mockField, 0);
    expect(component.selectedField).toBeNull();
    expect(component.selectedFieldIndex).toBe(-1);
  });

  it('debe eliminar un campo', () => {
    const mockField = {
      id: '1',
      type: CustomFieldType.TEXT,
      label: 'Test',
      idName: 'test',
      destination: CustomFieldDestination.PROFILE
    };
    
    component.formFields = [mockField];
    component.deleteField(mockField, 0);

    expect(customFieldService.deleteCustomField).toHaveBeenCalledWith('1');
    expect(component.formFields.length).toBe(0);
    expect(component.selectedField).toBeNull();
  });
  it('debe actualizar el destino del formulario', () => {
    const event = { value: CustomFieldDestination.REGISTRATION } as any;
    component.updateFormDestination(event);
    expect(component.formDestination).toBe(CustomFieldDestination.REGISTRATION);
  });

  it('debe validar campos correctamente', () => {
    component.formFields = [];
    expect(component.hasValidField()).toBeFalsy();

    component.formFields = [{
      id: '1',
      label: 'Test',
      type: CustomFieldType.TEXT,
      idName: 'test',
      destination: CustomFieldDestination.PROFILE
    }];
    expect(component.hasValidField()).toBeTruthy();
  });

describe('Pruebas de actualización de campos', () => {
    it('debe actualizar un campo de texto', () => {
      const mockField = {
        id: '1',
        type: CustomFieldType.TEXT,
        label: 'Test',
        idName: 'test',
        destination: CustomFieldDestination.PROFILE,
        additionalOptions: {}
      };
      
      component.formFields = [mockField];
      const event = { target: { value: 'Nuevo valor' } } as any;
      
      component.updateField(mockField, 'label', event);
      
      expect(component.formFields[0].label).toBe('Nuevo valor');
    });

    it('debe actualizar opciones adicionales', () => {
      const mockField = {
        id: '1',
        type: CustomFieldType.TEXT,
        label: 'Test',
        idName: 'test',
        destination: CustomFieldDestination.PROFILE,
        additionalOptions: {
          required: false,
          visible: true,
          multiSelect: false
        }
      };
      
      component.formFields = [mockField];
      const event = { target: { value: true } } as any;
      
      component.updateField(mockField, 'required', event);
      
      expect(component.formFields[0].additionalOptions.required).toBeTruthy();
    });

    it('debe actualizar valores numéricos correctamente', () => {
      const mockField = {
        id: '1',
        type: CustomFieldType.TEXT,
        label: 'Test',
        idName: 'test',
        destination: CustomFieldDestination.PROFILE,
        additionalOptions: {
          minLength: 0,
          maxLength: 50
        }
      };
      
      component.formFields = [mockField];
      const event = { target: { value: '10' } } as any;
      
      component.updateField({
        ...mockField,
        idName: 'test',
        destination: CustomFieldDestination.PROFILE
      } as Field, 'minLength', event);
      expect(component.formFields[0].additionalOptions.minLength).toBe(10);
    });
  });

  describe('Pruebas de opciones de campo', () => {
    it('debe actualizar las opciones de un campo select', () => {
      const mockField = {
        id: '1',
        type: CustomFieldType.SELECT,
        options: []
      ,
      idName: 'test',
      destination: CustomFieldDestination.PROFILE
      };
      
      component.selectedField = mockField;
      component.form.get('optionsString')?.setValue('Opción 1, Opción 2, Opción 3');
      
      component.updateOptions();
      expect(component.selectedField?.options).toEqual([
        { label: 'Opción 1', value: 'Opción 1' },
        { label: 'Opción 2', value: 'Opción 2' },
        { label: 'Opción 3', value: 'Opción 3' }
      ]);
    });

    it('no debe actualizar opciones si no hay campo seleccionado', () => {
      component.selectedField = null;
      component.form.get('optionsString')?.setValue('Opción 1, Opción 2');
      
      component.updateOptions();
      
      expect(component.selectedField).toBeNull();
    });
  });

  describe('Pruebas de drag and drop', () => {
    it('debe mover un item en el mismo contenedor', () => {
      const mockFields = [
        { id: '1', label: 'Campo 1' },
        { id: '2', label: 'Campo 2' }
      ];
      
      component.formFields = mockFields.map(field => ({
        ...field,
        type: CustomFieldType.TEXT,
        idName: 'test',
        destination: CustomFieldDestination.PROFILE
      }));
      
      const event = {
        previousContainer: { data: component.formFields },
        container: { data: component.formFields },
        previousIndex: 0,
        currentIndex: 1
      } as any;
      
      component.drop(event);
      
      expect(component.formFields[1].id).toBe('1');
    });

    it('debe copiar un item desde los campos disponibles', () => {
      const mockAvailableField = {
        type: CustomFieldType.TEXT,
        id: '1',
        label: 'Campo disponible'
      };
      
      component.availableFields = [{
        type: CustomFieldType.TEXT,
        id: '1',
        label: 'Campo disponible',
        idName: 'test',
        destination: CustomFieldDestination.PROFILE
      }];
      component.formFields = [];
      
      const event = {
        previousContainer: { data: component.availableFields },
        container: { data: component.formFields },
        previousIndex: 0,
        currentIndex: 0
      } as any;
      
      component.drop(event);
      
      expect(component.formFields.length).toBe(1);
      expect(component.formFields[0].isActive).toBeFalse();
    });
  });

  describe('Pruebas de guardado del formulario', () => {
    it('debe guardar campos nuevos', fakeAsync(() => {
      const mockField = {
        id: '_local1',
        type: CustomFieldType.TEXT,
        label: 'Nuevo campo',
        isActive: false,
        destination: CustomFieldDestination.PROFILE
      };
      
      component.formFields = [{ ...mockField, idName: 'test' }];
      component.saveForm();
      
      expect(customFieldService.createCustomField).toHaveBeenCalled();
      tick(400);
      expect(customFieldService.getCustomFields).toHaveBeenCalled();
    }));

    it('debe actualizar campos existentes', () => {
      const mockField = {
        id: '1', // ID sin '_' indica campo existente
        type: CustomFieldType.TEXT,
        label: 'Campo existente',
        isActive: true,
        destination: CustomFieldDestination.PROFILE
      };
      
      component.formFields = [{ ...mockField, idName: 'test' }];
      component.updateIndexFields();
      
      expect(customFieldService.updateCustomField).toHaveBeenCalled();
    });
    it('no debe guardar si no hay campos válidos', () => {
      component.formFields = [{
        id: '1',
        label: '', // Label vacío
        type: CustomFieldType.TEXT,
        idName: 'test',
        destination: CustomFieldDestination.PROFILE
      }];
      
      component.saveForm();
      
      expect(customFieldService.createCustomField).not.toHaveBeenCalled();
    });
  });

  describe('Pruebas de manejo de errores', () => {
    it('debe manejar error al crear campo', fakeAsync(() => {
      const errorSpy = spyOn(console, 'error');
      customFieldService.createCustomField.and.returnValue(
        throwError(() => new Error('Error de creación'))
      );

      const mockField = {
        id: '_local1',
        type: CustomFieldType.TEXT,
        label: 'Test',
        isActive: false
      };
      
      component.formFields = [{ ...mockField, idName: 'test', destination: CustomFieldDestination.PROFILE }];
      component.saveForm();
      
      tick(400);
      expect(errorSpy).toHaveBeenCalledWith('Error al guardar formulario:', jasmine.any(Error));
    }));
  });

  describe('Pruebas de integración', () => {
    it('debe actualizar el formulario cuando cambia el destino', fakeAsync(() => {
      const getFieldsSpy = spyOn(component, 'getFields');
      const event = { value: CustomFieldDestination.PROFILE } as MatSelectChange;
      
      component.updateFormDestination(event);
      tick(100);
      
      expect(component.formDestination).toBe(CustomFieldDestination.PROFILE);
      expect(getFieldsSpy).toHaveBeenCalled();
    }));

    it('debe limpiar el formulario al deseleccionar un campo', () => {
      const mockField = {
        id: '1',
        type: CustomFieldType.TEXT,
        label: 'Test'
      };
      
      // Primero seleccionamos
      component.selectField({...mockField, idName: 'test', destination: CustomFieldDestination.PROFILE}, 0);
      expect(component.selectedField).toBeTruthy();
      
      // Luego deseleccionamos
      component.selectField({...mockField, idName: 'test', destination: CustomFieldDestination.PROFILE}, 0);
      
      expect(component.selectedField).toBeNull();
      expect(component.form.get('label')?.value).toBe('');
    });
  });

});

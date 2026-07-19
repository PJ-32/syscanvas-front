import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasDetalle } from './canvas-detalle';

describe('CanvasDetalle', () => {
  let component: CanvasDetalle;
  let fixture: ComponentFixture<CanvasDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

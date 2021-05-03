import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterTaskComponent } from './master-task.component';

describe('MasterTaskComponent', () => {
  let component: MasterTaskComponent;
  let fixture: ComponentFixture<MasterTaskComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MasterTaskComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MasterTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

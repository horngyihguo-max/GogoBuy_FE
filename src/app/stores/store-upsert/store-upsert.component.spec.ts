import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreUpsertComponent } from './store-upsert.component';

describe('StoreUpsertComponent', () => {
  let component: StoreUpsertComponent;
  let fixture: ComponentFixture<StoreUpsertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreUpsertComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoreUpsertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

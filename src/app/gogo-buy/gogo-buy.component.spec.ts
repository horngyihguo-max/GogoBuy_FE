import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GogoBuyComponent } from './gogo-buy.component';

describe('GogoBuyComponent', () => {
  let component: GogoBuyComponent;
  let fixture: ComponentFixture<GogoBuyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GogoBuyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GogoBuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

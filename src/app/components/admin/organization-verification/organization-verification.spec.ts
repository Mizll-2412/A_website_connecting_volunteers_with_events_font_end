import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationVerification } from './organization-verification';

describe('OrganizationVerification', () => {
  let component: OrganizationVerification;
  let fixture: ComponentFixture<OrganizationVerification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationVerification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrganizationVerification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

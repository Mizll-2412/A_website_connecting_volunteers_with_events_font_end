import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteerProfile } from './volunteer-profile';

describe('VolunteerProfile', () => {
  let component: VolunteerProfile;
  let fixture: ComponentFixture<VolunteerProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VolunteerProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

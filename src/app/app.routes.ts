import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Home } from './components/home/home';
import { RegisterComponent } from './components/register/register';
import { VolunteerProfileComponent } from './components/volunteer-profile/volunteer-profile';
import { EventManagementComponent } from './components/event-management/event-management';
import { AdminComponent } from './components/admin/admin';
import { AdminDashboard } from './components/admin/admin-dashboard/admin-dashboard';
import { UserManagement } from './components/admin/user-management/user-management';
import { OrganizationVerification } from './components/admin/organization-verification/organization-verification';
import { ToChucComponent } from './components/admin/organization/organization';
import { SuKienComponent } from './components/admin/event/event';
import { TinhNguyenVienComponent } from './components/admin/volunteer/volunteer';
import { SkillManagement } from './components/admin/skill-management/skill-management';
import { FieldManagement } from './components/admin/field-management/field-management';
import { EventRegisteredComponent } from './components/events/events';
import { EventDetailComponent } from './components/event-detail/event-detail';
import { RegistrationListComponent } from './components/registration-list/registration-list';
import { ToChucListComponent } from './components/organization/organization';
import { FeaturedProfilesComponent } from './components/featured-profiles/featured-profiles';
import { Layout } from './components/layout/layout';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: Layout,
    children: [
      { path: 'home', component: Home },
      { path: 'profile', component: VolunteerProfileComponent },
      { path: 'manage-org', component: EventManagementComponent },
      { path: 'su-kien', component: EventRegisteredComponent },
      { path: 'su-kien/:id', component: EventDetailComponent },
      { path: 'dang-ky', component: RegistrationListComponent },
      { path: 'organization', component: ToChucListComponent },
      { path: 'list-user', component: FeaturedProfilesComponent },
      
      {
        path: 'admin',
        component: AdminComponent,
        children: [
          { path: 'dashboard', component: AdminDashboard },
          { path: 'users', component: UserManagement },
          { path: 'verify-organizations', component: OrganizationVerification },
          { path: 'tochuc', component: ToChucComponent },
          { path: 'sukien', component: SuKienComponent },
          { path: 'tinhnguyenvien', component: TinhNguyenVienComponent },
          { path: 'skills', component: SkillManagement },
          { path: 'fields', component: FieldManagement },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  
  { path: '**', redirectTo: 'home' }
];
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Home } from './components/home/home';
import { RegisterComponent } from './components/register/register';
import { VolunteerProfileComponent } from './components/volunteer-profile/volunteer-profile';
import { EventManagementComponent } from './components/event-management/event-management';
import { AdminComponent } from './components/admin/admin';
import { ToChucComponent } from './components/admin/organization/organization';
import { SuKienComponent } from './components/admin/event/event';
import { TinhNguyenVienComponent } from './components/admin/volunteer/volunteer';
import { EventRegisteredComponent } from './components/events/events';
import { EventDetailComponent } from './components/event-detail/event-detail';
import { ToChucListComponent } from './components/organization/organization';
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
      { path: 'organization', component: ToChucListComponent },
      
      {
        path: 'admin',
        component: AdminComponent,
        children: [
          { path: 'tochuc', component: ToChucComponent },
          { path: 'sukien', component: SuKienComponent },
          { path: 'tinhnguyenvien', component: TinhNguyenVienComponent },
          { path: '', redirectTo: 'tochuc', pathMatch: 'full' }
        ]
      },
      
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  
  { path: '**', redirectTo: 'home' }
];
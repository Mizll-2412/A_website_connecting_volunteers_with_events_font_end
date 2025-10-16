import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin';
import { ToChucComponent } from './organization/organization';
import { TinhNguyenVienComponent } from './volunteer/volunteer';
import { SuKienComponent } from './event/event';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'tochuc', component: ToChucComponent },
      { path: 'tinhnguyenvien', component: TinhNguyenVienComponent },
      { path: 'sukien', component: SuKienComponent },
      { path: '', redirectTo: 'tochuc', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}

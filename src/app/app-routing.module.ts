import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthenticationGuard } from './core/guard/authentication.guard';


const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: '',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
        canActivate: [AuthenticationGuard],
    },
    {
        path: 'setting',
        loadChildren: () => import('./setting/setting.module').then(m => m.SettingModule)
    },
    {
        path: '**',
        redirectTo: '/dashboard'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }

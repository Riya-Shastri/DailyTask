import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { AddTaskComponent } from './add-task/add-task.component';
import { MasterTaskComponent } from './master-task/master-task.component';
import { ProjectsGooglesheetComponent } from './projects-googlesheet/projects-googlesheet.component';
import { ViewUpdatesComponent } from './view-updates/view-updates.component';


const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
        path: 'dashboard',
        component: AddTaskComponent,
        canActivate: [NgxPermissionsGuard],
        data: {
            permissions: {
                only: 'ROLE_USER',
                redirectTo: '/updates'
            }
        }
    },
    {
        path: 'updates',
        component: ViewUpdatesComponent,
        canActivate: [NgxPermissionsGuard],
        data: {
            permissions: {
                only: 'ROLE_ADMIN',
                redirectTo: '/dashboard'
            }
        }
    },
    {
        path: 'project-links',
        component: ProjectsGooglesheetComponent,
        canActivate: [NgxPermissionsGuard],
        data: {
            permissions: {
                only: 'ROLE_ADMIN',
                redirectTo: '/dashboard'
            }
        }
    },
    {
        path: 'project/task-master',
        component: MasterTaskComponent,
        canActivate: [NgxPermissionsGuard],
        data: {
            permissions: {
                only: 'ROLE_USER',
                redirectTo: '/dashboard'
            }
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DashboardRoutingModule { }

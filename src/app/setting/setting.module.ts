import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SettingRoutingModule } from './setting-routing.module';
import { EmailComponent } from './email/email.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { TagInputModule } from 'ngx-chips';

@NgModule({
    declarations: [EmailComponent],
    imports: [
        CommonModule,
        SettingRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        NgbTypeaheadModule,
        NgxPermissionsModule.forChild(),
        TagInputModule
    ],
    providers: [

    ],
    schemas: []
})
export class SettingModule { }

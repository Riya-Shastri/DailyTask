import { Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { SettingService } from './service/setting.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-email',
    templateUrl: './email.component.html',
    styleUrls: ['./email.component.css'],

})
export class EmailComponent implements OnInit {

    emailSettingForm: FormGroup;
    projectsList = [];
    employeeList = [];
    searchProject;
    @ViewChild('instance') instance: NgbTypeahead;
    focus$ = new Subject<string>();
    click$ = new Subject<string>();
    formatter = (x) => x;
    errorMessage;
    backendError;
    loading = false;

    constructor(
        private formBuilder: FormBuilder,
        private settingService: SettingService
    ) {
        this.emailSettingForm = this.formBuilder.group({
            projectId: new FormControl(),
            projectName: new FormControl(),
            emailSettingsUpdateRequests: this.formBuilder.array([]),
        });
    }

    ngOnInit(): void {
        this.fillProjectDropdown();
    }

    get f() { return this.emailSettingForm.controls; };

    get empListControl(): FormArray {
        return this.emailSettingForm.get('emailSettingsUpdateRequests') as FormArray;
    }

    fillProjectDropdown() {
        this.loading = true;
        this.settingService.getProjects().toPromise().then(res => {

            this.projectsList = res[`data`];

            this.loading = false;
            this.searchProject = (text$: Observable<string>) => {
                const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
                const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
                const inputFocus$ = this.focus$;

                return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
                    map(term => term === '' ? res[`data`]
                        : res[`data`].filter(
                            v => v.projectName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
                );
            };

        }).catch(err => {
            this.projectsList = [];
        });
    }

    onChangeProject(event) {

        event.preventDefault();
        this.empListControl.clear();
        this.backendError = '';
        const selectedProjectName = event.item[`projectName`];
        this.f.projectName.setValue(selectedProjectName);

        this.projectsList.filter((cValue) => {
            if (cValue[`projectName`] === selectedProjectName) {
                this.f[`projectId`].setValue(cValue[`projectId`]);
            }
        });

        this.settingService.getUserByProject(this.f[`projectId`].value).toPromise().then(res => {
            if (res && res['data'] && res['data']['emailSettings']) {
                this.employeeList = res['data']['emailSettings'];

                this.employeeList.forEach(emp => {
                    //Add employee
                    this.empListControl.push(this.addNewControlWithValue(emp));
                });
            }
        }).catch(err => { this.employeeList = []; });
    }

    getProjectName(event) {
        if (!event.target.value) {
            this.f[`projectId`].setValue(null);
        }
    }

    onSameForAll(event) {
        if (event.target.checked) {

            this.empListControl.controls.forEach((control, index) => {
                const listValue = this.empListControl.value[0];

                const bccEmails = listValue['bccEmails'];
                const ccEmails = listValue['ccEmails'];
                const toEmails = listValue['toEmails'];
                const receiverName = listValue['receiverName'];
                const senderName = listValue['senderName'];

                if (index !== 0) {
                    control.patchValue({ 'ccEmails': ccEmails });
                    control.patchValue({ 'toEmails': toEmails });
                    control.patchValue({ 'bccEmails': bccEmails });
                    control.patchValue({ 'receiverName': receiverName });
                    control.patchValue({ 'senderName': senderName });
                }
            });
        }
    }

    // create form group with value and without value
    addNewControlWithValue(controlValue: any = {}) {
        return this.formBuilder.group({
            userId: new FormControl(controlValue.userId || null),
            userName: new FormControl(controlValue.userName || null),
            senderName: new FormControl(controlValue.senderName || null, Validators.compose([Validators.required])),
            receiverName: new FormControl(controlValue.receiverName || '', Validators.compose([Validators.required])),
            toEmails: new FormControl(controlValue.toEmails || null, Validators.compose([
                Validators.required])),
            ccEmails: new FormControl(controlValue.ccEmails || null),
            bccEmails: new FormControl(controlValue.bccEmails || null),
            sameForAll: new FormControl(false),
        });
    }

    trackByIndex(index) {
        return index;
    }

    onSaveSetting() {
        this.backendError = '';
        const projectId = this.emailSettingForm.value['projectId'];

        let usersForAlertMsg = '';
        let usersForAlertArray = [];

        this.emailSettingForm.value['emailSettingsUpdateRequests'].forEach(element => {
            if (element['toEmails'].length === 0) {
                usersForAlertMsg += '<li>' + element['userName'] + '</li>';
                usersForAlertArray.push(element['userName']);
            }
        });

        setTimeout(() => {
            if (usersForAlertArray.length === 0) {
                this.settingService.saveEmailSetting(this.emailSettingForm.value, projectId).toPromise().then(res => {
                    if (res) {
                        Swal.fire({
                            text: 'Settings saved successfully',
                            icon: 'success',
                            confirmButtonText: 'Ok',
                        }).then();
                    }
                }).catch(err => {
                    this.backendError = err.error.errorMessage;
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    // text: 'Please provide atleast one email for "To Email" for the following users:',
                    confirmButtonText: 'Ok',
                    html: '<h5>Please provide atleast one email for <b> To Email </b> for the following users: </h5>' +
                        '<ul class="text-left mt-2">' + usersForAlertMsg + '</ul>',
                }).then();
            }
        }, 100);
    }

    validEmail(control: FormControl) {
        if (control.value) {
            const regularExpression = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            if (!regularExpression.test(String(control.value).toLowerCase())) {
                return { 'validEmail': regularExpression.test(String(control.value).toLowerCase()) };
            }
        }
        return null;
    }

    public validators = [this.validEmail];

    public errorMessages = {
        'validEmail': 'Please enter valid email id'
    };

}

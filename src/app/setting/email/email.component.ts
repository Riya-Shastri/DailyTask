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

    userEmailSettingForm: FormGroup;
    projectEmailSettingForm: FormGroup;
    projectsList = [];
    employeeList = [];
    searchProject;
    @ViewChild('mailInstance') mailInstance: NgbTypeahead;
    @ViewChild('projectInstance') projectInstance: NgbTypeahead;
    focus$ = new Subject<string>();
    click$ = new Subject<string>();
    mailFormatter = (x) => x;
    projectFormatter = (x) => x;
    errorMessage;
    backendError;
    loading = false;

    projects = [];
    active = 1;
    isSaveServer = false;
    isSaveServerDisable = true;

    constructor(
        private formBuilder: FormBuilder,
        private settingService: SettingService
    ) {
        this.userEmailSettingForm = this.formBuilder.group({
            projectId: new FormControl(),
            projectName: new FormControl(),
            emailSettingsUpdateRequests: this.formBuilder.array([]),
        });

        this.projectEmailSettingForm = this.formBuilder.group({
            configType: new FormControl('PROJECT'),
            refId: new FormControl(null, Validators.compose([Validators.required])),
            projectName: new FormControl(null, Validators.compose([Validators.required])),
            emailHost: new FormControl(null, Validators.compose([Validators.required])),
            emailPort: new FormControl(null, Validators.compose([
                Validators.required,
                Validators.pattern(/^[0-9]{3,4}$/)
            ])),
            emailProtocol: new FormControl(null, Validators.compose([Validators.required])),
            emailUser: new FormControl(null, Validators.compose([Validators.required,
            Validators.pattern(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i)])),
            emailPswd: new FormControl(null, Validators.compose([Validators.required]))
        });
    }

    ngOnInit(): void {
        this.fillProjectDropdown();
    }

    get f() { return this.userEmailSettingForm.controls; };
    get projectForm() { return this.projectEmailSettingForm.controls; };

    get empListControl(): FormArray {
        return this.userEmailSettingForm.get('emailSettingsUpdateRequests') as FormArray;
    }

    fillProjectDropdown() {
        this.loading = true;
        this.settingService.getProjects().toPromise().then(res => {

            this.projectsList = res[`data`];

            this.loading = false;
            this.searchProject = (text$: Observable<string>) => {
                const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());

                if (this.active === 1) {
                    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.mailInstance.isPopupOpen()));
                    const inputFocus$ = this.focus$;

                    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
                        map(term => term === '' ? res[`data`]
                            : res[`data`].filter(
                                v => v.projectName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
                    );
                } else {
                    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.projectInstance.isPopupOpen()));
                    const inputFocus$ = this.focus$;

                    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
                        map(term => term === '' ? res[`data`]
                            : res[`data`].filter(
                                v => v.projectName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
                    );
                }
            };

        }).catch(err => {
            this.projectsList = [];
        });
    }

    fillTypeaheadForProject() {
        this.loading = true;
        this.settingService.getProjects().toPromise().then(res => {

            this.projectsList = res[`data`];

            this.loading = false;
            this.searchProject = (text$: Observable<string>) => {
                const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
                const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.projectInstance.isPopupOpen()));
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

    onChangeProject(event, tabNo) {

        event.preventDefault();
        this.empListControl.clear();
        this.backendError = '';
        this.isSaveServer = false;
        this.isSaveServerDisable = true;
        const selectedProjectName = event.item[`projectName`];

        if (tabNo === 1) {
            this.f.projectName.setValue(selectedProjectName);
        } else {
            this.projectForm.projectName.setValue(selectedProjectName);
        }

        this.projectsList.filter((cValue) => {
            if (cValue[`projectName`] === selectedProjectName) {

                if (tabNo === 1) {
                    this.f[`projectId`].setValue(cValue[`projectId`]);
                } else {
                    this.projectForm[`refId`].setValue(cValue[`projectId`]);
                }
            }
        });

        if (tabNo === 1) {
            this.settingService.getUserByProject(this.f[`projectId`].value).toPromise().then(res => {
                if (res && res['data'] && res['data']['emailSettings']) {
                    this.employeeList = res['data']['emailSettings'];

                    this.employeeList.forEach(emp => {
                        //Add employee
                        this.empListControl.push(this.addNewControlWithValue(emp));
                    });
                }
            }).catch(err => { this.employeeList = []; });
        } else {
            this.settingService.getProejctServer(this.projectForm[`refId`].value).toPromise().then(res => {
                if (res && res['data']) {
                    this.projectEmailSettingForm.patchValue({
                        configType: 'PROJECT',
                        emailHost: res['data']['emailHost'],
                        emailProtocol: res['data']['emailProtocol'],
                        emailUser: res['data']['emailUser'],
                        emailPswd: res['data']['emailPswd']
                    });

                    if (res && res['data'] && res['data']['emailPort'] === 0) {
                        this.projectEmailSettingForm.patchValue({
                            emailPort: null
                        });
                    } else {
                        this.projectEmailSettingForm.patchValue({
                            emailPort: res['data']['emailPort'],
                        });

                    }
                }
            }).catch(err => { });

        }
    }

    getProjectName(event, tabNo) {
        if (tabNo === 1 && !event.target.value) {
            this.f[`projectId`].setValue(null);
        }
        if (tabNo === 2 && !event.target.value) {
            this.projectForm[`refId`].setValue(null);
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
        const projectId = this.userEmailSettingForm.value['projectId'];

        let usersForAlertMsg = '';
        let usersForAlertArray = [];

        this.userEmailSettingForm.value['emailSettingsUpdateRequests'].forEach(element => {
            if (element['toEmails'].length === 0) {
                usersForAlertMsg += '<li>' + element['userName'] + '</li>';
                usersForAlertArray.push(element['userName']);
            }
        });

        setTimeout(() => {
            if (usersForAlertArray.length === 0) {
                this.settingService.saveEmailSetting(this.userEmailSettingForm.value, projectId).toPromise().then(res => {
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

    saveServer(isTestClick) {

        this.isSaveServer = true;
        if (!this.projectEmailSettingForm.valid) {
            return;
        }

        let finalPayload;

        if (isTestClick) {
            finalPayload = {
                "testMailConfig": true,
                "emailConfigSetting": this.projectEmailSettingForm.value
            }
        } else {
            finalPayload = {
                "emailConfigSetting": this.projectEmailSettingForm.value
            }
        }

        this.settingService.testProejctServer(finalPayload, isTestClick).toPromise().then(res => {

            if (res && isTestClick) {
                this.isSaveServerDisable = false;

                Swal.fire({
                    text: 'Test server successfully',
                    icon: 'success',
                    confirmButtonText: 'Ok',
                }).then();
            }
            if (res && !isTestClick) {
                Swal.fire({
                    text: 'Saved server successfully',
                    icon: 'success',
                    confirmButtonText: 'Ok',
                }).then();
            }
        }).catch(err => {
            this.backendError = err.error['errorMessage'];
        });
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

    changeControlValue() {
        this.isSaveServerDisable = true;
        this.backendError = '';
    }

}

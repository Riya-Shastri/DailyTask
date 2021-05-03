import { Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbDateStruct, NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { SharedService } from 'src/app/share/shared.service';
import { DashboardService } from '../service/dashboard.service';
import { ManageDateService } from '../service/manage-date.service';

@Component({
    selector: 'app-view-updates',
    templateUrl: './view-updates.component.html',
    styleUrls: ['./view-updates.component.css']
})
export class ViewUpdatesComponent implements OnInit {

    currentPage = 1;
    pageSize: number;
    projectsList = [];
    employeeList = [];
    viewUpdateForm: FormGroup;
    paginationReqPayload = {};
    dailyUpdateDetail = [];
    apiCalled = false;
    userName = '';
    minDate: NgbDateStruct;
    maxDate: NgbDateStruct;
    groupByOptions = [
        'Project',
        'User'
    ];
    pageSizeOptions = [2, 5, 10, 15, 20, 25, 50, 100];
    showHistory = false;
    dateFilterError = '';
    searchProject;
    @ViewChild('instance') instance: NgbTypeahead;
    focus$ = new Subject<string>();
    click$ = new Subject<string>();
    showDescription = false;

    formatter = (x) => x;

    constructor(
        private formBuilder: FormBuilder,
        private dashboardService: DashboardService,
        private manageDate: ManageDateService,
        private shareDataService: SharedService
    ) {
        this.userName = localStorage.getItem('userName') || '';
        this.minDate = this.manageDate.setMinDate();
        this.maxDate = this.manageDate.setMaxDate();
    }

    ngOnInit(): void {

        this.viewUpdateForm = this.formBuilder.group({
            projectId: new FormControl(),
            projectName: new FormControl(),
            userId: new FormControl('0'),
            itemsPerPage: new FormControl(5),
            currentPage: new FormControl(1),
            groupBy: new FormControl('User'),
            fromDate: new FormControl(this.maxDate),
            toDate: new FormControl(this.maxDate),
            fieldsToShow: new FormControl(),
            isDecShow: new FormControl()
        });

        this.fillProjectDropdown();
        this.getTaskDetail();
        this.shareDataService.currentSyncValue.subscribe(message => {
            if (message) {
                this.fillProjectDropdown();
                this.getTaskDetail();
                this.shareDataService.changeMessage(false);
            }
        });
    }

    async displayDescription(values: any) {

        if (values['currentTarget']['checked']) {
            this.viewUpdateForm.patchValue({
                fieldsToShow: ['DESCRIPTION'],
                isDecShow: new FormControl(true)
            });
            this.showDescription = true;
        } else {
            this.viewUpdateForm.patchValue({
                fieldsToShow: [],
                isDecShow: new FormControl(false)
            });
            this.showDescription = false;
        }
        this.getTaskDetail();
    }

    get f() { return this.viewUpdateForm.controls; }

    fillProjectDropdown() {
        this.dashboardService.getProject().toPromise().then(res => {
            this.projectsList = res[`data`];

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

    getTaskDetail() {
        this.apiCalled = false;

        if (this.viewUpdateForm.value['fieldsToShow'] &&
            this.viewUpdateForm.value['fieldsToShow'].length > 0) {
            this.showDescription = true;
        }

        this.dashboardService.getTaskdetail(this.viewUpdateForm.value).toPromise().then(res => {
            if (res && res[`data`][`groupedList`]) {
                this.apiCalled = true;
                this.dailyUpdateDetail = res[`data`][`groupedList`];
            }
        }).catch(err => {
            this.dailyUpdateDetail = [];
        });
    }

    onPageChange(pageNum: number): void {
        if (pageNum) {
            this.f[`currentPage`].setValue(pageNum);
        } else {
            pageNum = 1;
            this.f[`currentPage`].setValue(1);
        }
        this.pageSize = (this.f[`itemsPerPage`].value * (pageNum - 1));
    }

    changePagesize(): void {
        if (!this.pageSize) {
            this.pageSize = 0;
        }
        const itemsPerPage = this.pageSize + Number(this.f[`itemsPerPage`].value);
        this.f[`itemsPerPage`].setValue(itemsPerPage);
    }

    getProjectName(event) {
        if (!event.target.value) {
            this.employeeList = [];
            this.f[`userId`].setValue('0');
            this.f[`projectId`].setValue(null);
            this.getTaskDetail();
        }
    }

    onChangeProject(event) {
        event.preventDefault();

        const selectedProjectName = event.item[`projectName`];
        this.f.projectName.setValue(selectedProjectName);

        this.projectsList.filter((cValue) => {
            if (cValue[`projectName`] === selectedProjectName) {
                this.f[`projectId`].setValue(cValue[`projectId`]);
            }
        });

        if (selectedProjectName) {
            this.getUsersByProject(this.f[`projectId`].value);
        } else {
            this.employeeList = [];
            this.f[`userId`].setValue('0');
            this.f[`projectId`].setValue(null);
            this.getTaskDetail();
        }
    }


    getUsersByProject(projectId) {
        this.dashboardService.getUserByProjects(projectId).toPromise().then(users => {
            if (users && users[`data`]) {
                this.f[`userId`].setValue('0');
                this.employeeList = users[`data`];
            }
            this.getTaskDetail();
        }).catch(err => {
            this.employeeList = [];
        });
    }

    onChangeDateFilter() {
        this.dateFilterError = '';
        const selectedFromDate = this.manageDate.objectToDate(this.f[`fromDate`].value);
        const selectedToDate = this.manageDate.objectToDate(this.f[`toDate`].value);
        const currentDate = this.manageDate.currentDateInDateFormate(this.maxDate);

        if (selectedFromDate > selectedToDate) {
            this.dateFilterError = 'Please select valid date';
            this.dailyUpdateDetail = [];
        } else {
            this.getTaskDetail();
        }

        if (selectedFromDate === currentDate && selectedToDate === currentDate) {
            this.showHistory = false;
        }
        if (selectedFromDate !== currentDate && selectedToDate !== currentDate ||
            selectedFromDate !== currentDate && selectedToDate === currentDate) {
            this.showHistory = true;
        }
    }

    resetForm() {
        this.minDate = this.manageDate.setMinDate();
        this.maxDate = this.manageDate.setMaxDate();

        // this.viewUpdateForm.reset();

        this.f[`fromDate`].setValue(this.maxDate);
        this.f[`toDate`].setValue(this.maxDate);
        this.f[`currentPage`].setValue(1);
        this.f[`groupBy`].setValue('User');
        this.f[`itemsPerPage`].setValue(5);
        this.f[`projectId`].setValue(null);
        this.f[`projectName`].setValue(null);
        this.f[`userId`].setValue('0');
        this.employeeList = [];
        this.getTaskDetail();
    }
}

import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { SharedService } from 'src/app/share/shared.service';
import { OwlOptions } from 'ngx-owl-carousel-o';
import Swal from 'sweetalert2';
import { DashboardService } from '../service/dashboard.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-add-task',
    templateUrl: './add-task.component.html',
    styleUrls: ['./add-task.component.css']
})
export class AddTaskComponent implements OnInit {

    customOptions: OwlOptions = {
        autoplayHoverPause: true,
        autoWidth: true,
        loop: true,
        mouseDrag: true,
        touchDrag: true,
        pullDrag: true,
        dots: true,
        navSpeed: 300,
        navText: ['', ''],
        responsive: {
            0: {
                items: 1
            },
            400: {
                items: 1
            },
            740: {
                items: 1
            },
            940: {
                items: 1
            }
        },
        nav: true
    }

    taskForm: FormGroup;
    submitted = false;
    previewMail = false;
    backendError = null;
    projectList = [];
    taskStatus = [
        { statusId: 1, statusTitle: 'COMPLETED' },
        { statusId: 2, statusTitle: 'INPROGRESS' },
        { statusId: 3, statusTitle: 'REMAINING' }
    ];
    displayEODFields = false;
    isBtnDissabled = false;
    isNewtaskDissabled = false;
    projectwiseTaskList = [];
    disableEod = true;
    userName = '';
    taskByProjectID = {};
    previewHTML;
    convertHTML;
    hourError;

    constructor(
        private dashboardService: DashboardService,
        private formBuilder: FormBuilder,
        private shareDataService: SharedService,
        private modalService: NgbModal,
        private config: NgbModalConfig,
        private sanitizer: DomSanitizer
    ) {
        this.userName = localStorage.getItem('userName') || '';
        this.config.backdrop = 'static';
        this.config.keyboard = false;
        this.convertHTML = this.sanitizer;
    }

    ngOnInit(): void {
        this.initFormGroup();
        this.getProjectList();
        this.getTaskList();
        this.shareDataService.currentSyncValue.subscribe(message => {
            if (message) {
                this.initFormGroup();
                this.getProjectList();
                this.getTaskList();
                this.shareDataService.changeMessage(false);
            }
        });
    }

    // initialize form group
    initFormGroup() {
        this.taskForm = this.formBuilder.group({
            isEodUpdate: new FormControl(false),
            taskList: this.formBuilder.array([]),
        });
    }

    // Bind projct dropdown
    getProjectList() {
        this.dashboardService.getProjectsAndTask().toPromise().then(res => {
            if (res && res[`data`]) {
                this.projectList = res[`data`];
                this.projectList.forEach(project => {
                    this.taskByProjectID[project.projectId] = project.taskMasters;
                });
            }
        }).catch(err => {
            this.projectList = [];
            this.taskByProjectID = {};
        });
    }

    // get all saved task on page load
    getTaskList() {
        this.dashboardService.getAllSaveTask().toPromise().then(res => {
            if (res && res[`data`] && res[`data`][`taskList`].length > 0) {
                this.disableEod = false;
                const taskList = res[`data`][`taskList`];
                taskList.forEach(element => {
                    if (element[`isEodUpdate`]) {
                        this.displayEODFields = true;
                        this.taskForm.patchValue({
                            isEodUpdate: true
                        });
                        this.isNewtaskDissabled = true;
                        this.isBtnDissabled = true;
                        this.disableEod = true;
                    }
                    this.projectDetail.push(this.addNewControlWithValue(element));
                });
            } else {
                this.addNewTaskBlogs();
            }
        }).catch(err => { });
    }

    // Add new task
    addNewTaskBlogs() {
        this.submitted = false;
        this.previewMail = false;
        this.isBtnDissabled = false;
        this.projectDetail.push(this.addNewControlWithValue());
    }

    // create form group with value and without value
    addNewControlWithValue(controlValue: any = {}) {
        return this.formBuilder.group({
            projectId: new FormControl(controlValue.projectId || null, Validators.compose([Validators.required])),
            taskMasterId: new FormControl(controlValue.taskMasterId || null, Validators.compose([Validators.required])),
            taskDesc: new FormControl(controlValue.taskDesc || '', Validators.compose([Validators.required])),
            estHr: new FormControl(controlValue.estHr || null, Validators.compose([
                Validators.required,
                Validators.pattern(/^\s*(?=.*[1-9])\d{1,2}(?:\.\d{1,2})?\s*$/)])),
            taskId: new FormControl(controlValue.taskId || null),
            actualHr: new FormControl(controlValue.actualHr || null),
            status: new FormControl(controlValue.status || null),
            isTrackerUsed: new FormControl(controlValue.isTrackerUsed || false),
            eodComments: new FormControl(controlValue.eodComments || ''),
        });
    }

    changeControlValue() {
        this.backendError = null;
        this.hourError = '';
        if (!this.isNewtaskDissabled) {
            this.isBtnDissabled = false;
        }
    }

    // bind task dropdown
    getTaskByProjectId(selectedValue) {
        return this.taskByProjectID[selectedValue] || [];
        // const taskList = this.projectList.find((item) => Number(item.projectId) === Number(selectedValue));
        // return taskList ? taskList.taskMasters : [];
    }

    get f() { return this.taskForm.controls.taskList; }

    get projectDetail(): FormArray {
        return this.taskForm.get('taskList') as FormArray;
    }

    deleteTask(index) {
        this.projectDetail.removeAt(index);
        const newData = [...this.projectDetail.value];
        setTimeout(() => {
            this.projectDetail.clear();
        }, 100);

        setTimeout(() => {
            if (newData.length === 0) {
                this.projectDetail.push(this.addNewControlWithValue());
            } else {
                newData.forEach((element, j) => {
                    this.projectDetail.push(this.addNewControlWithValue(element));
                });
            }
        }, 100);
    }

    showHideControls() {
        this.displayEODFields = this.taskForm.value.isEodUpdate;
        const taskControlArr = this.projectDetail.controls;
        if (this.displayEODFields) {
            this.isBtnDissabled = false;
            taskControlArr.forEach((element) => {
                const actualHr = element[`controls`][`actualHr`];
                const status = element[`controls`][`status`];

                actualHr.setValidators([Validators.pattern(/^\s*\d{1,2}(?:\.\d{1,2})?\s*$/)]);
                actualHr.updateValueAndValidity();

                status.setValidators([Validators.required]);
                status.updateValueAndValidity();
            });
        } else {
            taskControlArr.forEach((element) => {
                const actualHr = element[`controls`][`actualHr`];
                const status = element[`controls`][`status`];

                actualHr.clearValidators();
                actualHr.updateValueAndValidity();

                status.clearValidators();
                status.updateValueAndValidity();
            });
        }
    }

    saveTaks() {
        this.dashboardService.saveTask(this.taskForm.value).toPromise().then(res => {
            if (res && res[`data`]) {
                (this.projectDetail).clear();
                const taskList = res[`data`][`taskList`];
                this.disableEod = false;
                taskList.forEach((element) => {
                    setTimeout(() => {
                        this.projectDetail.push(this.addNewControlWithValue(element));
                    }, 100);
                });
            }
            let messageText = 'Task saved successfully.';
            if (this.displayEODFields) {
                this.isNewtaskDissabled = true;
                this.disableEod = true;
                messageText = 'Your EOD update has been succussfully sent.';
            }
            Swal.fire({
                text: messageText,
                icon: 'success',
                confirmButtonText: 'Ok',
            }).then();
        }).catch(err => {
            this.isBtnDissabled = false;
            if (err && err.error) {
                this.backendError = err.error[`errorMessage`];
            }
        });
    }

    onSubmit(displayPreview, content) {
        this.submitted = true;
        if (!this.taskForm.valid) {
            return;
        }
        this.backendError = null;

        if (displayPreview && !content) {
            this.modalService.dismissAll();
            this.isBtnDissabled = true;

            if (this.taskForm.value['isEodUpdate']) {
                const spentTimeArr = [];
                this.taskForm.value['taskList'].forEach(element => {
                    spentTimeArr.push(Number(element['actualHr']));
                });

                const sum = spentTimeArr.reduce((acc, cur) => acc + cur, 0);
                const currentDate = new Date();
                const CurrentDay = currentDate.getDay();

                if (sum < 8 && CurrentDay !== 6) {
                    this.hourError = 'Total spent hours should not be less-then 8.';
                }
                else if (sum < 4 && CurrentDay === 6) {
                    this.hourError = 'Total spent hours should not be less-then 4.';
                }
                else {
                    this.hourError = '';
                    Swal.fire({
                        title: 'Are you sure?',
                        text: 'This will fill the timesheet in easycollab and send the emails as per the configuration.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes',
                        cancelButtonText: 'No'
                    }).then((result) => {
                        if (result.value) {
                            this.saveTaks();
                        } else {
                            this.isBtnDissabled = false;
                        }
                    });
                }
            } else {
                this.saveTaks();
            }
        } else {
            this.taskForm.value['taskList'].forEach(element => {
                if ((element['status'] === 1 || element['status'] === 2) && !element['actualHr']) {
                    this.modalService.dismissAll();
                    this.backendError = 'Please provide spent hour if status is COMPLETED/INPROGRESS';
                }
            });

            if (!this.backendError) {

                const requestPayload = { taskList: this.taskForm.value['taskList'] };
                this.dashboardService.previewEmail(requestPayload).toPromise().then(res => {
                    if (res && res[`data`]) {
                        this.previewHTML = res['data'];
                        this.modalService.open(content, { size: 'lg' });
                    }
                }).catch(err => {
                    this.isBtnDissabled = false;
                    this.previewHTML = '';
                    if (err && err.error) {
                        this.backendError = err.error[`errorMessage`];
                    }
                });
            }
        }
    }

    trackByIndex(index) {
        return index;
    }

    close() {
        this.modalService.dismissAll();
    }
}

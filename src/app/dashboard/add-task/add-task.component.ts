import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { SharedService } from 'src/app/share/shared.service';
import { OwlOptions } from 'ngx-owl-carousel-o';
import Swal from 'sweetalert2';
import { DashboardService } from '../service/dashboard.service';
import { DomSanitizer } from '@angular/platform-browser';
import * as moment from 'moment';

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
    };
    taskForm: FormGroup;
    fillLeaveForm: FormGroup;
    masterTaskForm: FormGroup;
    submitted = false;
    fillLeaveSubmitted = false;
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
    hourError = null;
    uniqueProjectList = [];
    finalLeaveHoursArr = [];
    reason = [
        { id: '0', title: 'Came Late' },
        { id: '1', title: 'Left Early' },
        { id: '2', title: 'Halfday Leave' }
    ];
    isEditLeaveForm = false;
    editLeaveIndex;
    totalSpentTime;
    totalLeaveTime;
    totalTime;
    isProcessOn = false;

    addTaskSubmitted = false;
    selctedProjectName;

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
            eodUpdate: new FormControl(false),
            timesheet: this.formBuilder.array([]),
            projects: this.formBuilder.array([]),
        });

        this.fillLeaveForm = this.formBuilder.group({
            reasonId: new FormControl(null, Validators.compose([Validators.required])),
            leaveReason: new FormControl(null),
            leaveNotes: new FormControl(null, Validators.compose([Validators.required])),
            actualHr: new FormControl(null, Validators.compose([
                Validators.required,
                Validators.pattern(/^(0?[0-9]|1[0-2]):[0-5][0-9]$/)])),
            // Validators.pattern(/^\s*(?=.*[0-9])\d{1,1}(\.[1-5][0-9]?)?$/)])),
            type: new FormControl('LEAVE'),
            totalLeaveHours: new FormControl(0),
        });

        this.masterTaskForm = this.formBuilder.group({
            projectId: new FormControl(null),
            masterTaskId: new FormControl(0),
            masterTaskTitle: new FormControl('', Validators.compose([Validators.required])),
        });
    }

    async addTask(content, projectId: any, selectedValue, index) {

        if (selectedValue === 'false') {

            this.addTaskSubmitted = false;
            this.config.backdrop = 'static';
            this.config.keyboard = false;
            this.masterTaskForm.reset();

            const newArray = await this.projectList.filter((item) => {
                return item['projectId'] === projectId;
            });

            if (newArray) {
                this.selctedProjectName = newArray[0]['projectName'];
            }
            this.modalService.open(content);

            this.masterTaskForm.patchValue({ masterTaskId: 0 });
            this.masterTaskForm.patchValue({ projectId: newArray[0]['projectId'] });

            this.projectDetail.controls[index][`controls`]['taskMasterId'].setValue(null);
        }
    }

    async saveData() {
        this.addTaskSubmitted = true;

        if (!this.masterTaskForm.valid) {
            return;
        }

        await this.dashboardService.addEditMasterTask(this.masterTaskForm.value).toPromise().then(async res => {
            if (res) {

                this.getProjectList();
                this.modalService.dismissAll();
                this.masterTaskForm.reset();
                Swal.fire({
                    text: 'Task Added Successfully.',
                    icon: 'success',
                    confirmButtonText: 'Ok',
                }).then();
            }
        }).catch(err => { });

        this.addTaskSubmitted = false;
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
            if (res && res[`data`] && res[`data`][`timesheet`].length > 0) {
                this.disableEod = false;
                const timesheet = res[`data`][`timesheet`];
                timesheet.forEach(element => {
                    if (res['data'][`eodUpdate`]) {

                        this.displayEODFields = true;
                        this.isBtnDissabled = true;
                        this.isNewtaskDissabled = true;
                        this.disableEod = true;
                        this.taskForm.patchValue({
                            eodUpdate: true
                        });
                    }

                    if (element['type'] === 'LEAVE') {
                        this.finalLeaveHoursArr.push(element);
                    } else {
                        this.projectDetail.push(this.addNewControlWithValue(element));
                    }

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
        const taskControlArr = this.projectDetail.controls;

        if (this.displayEODFields) {
            taskControlArr.forEach((element) => {
                const actualHr = element.get('actualHr');
                const status = element.get('status');
                actualHr.setValidators([Validators.required,
                Validators.pattern(/^(0?[0-9]|1[0-2]):[0-5][0-9]$/)]);
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

    // create form group with value and without value
    addNewControlWithValue(controlValue: any = {}) {
        return this.formBuilder.group({
            projectId: new FormControl(controlValue.projectId || null, Validators.compose([Validators.required])),
            taskMasterId: new FormControl(controlValue.taskMasterId || null, Validators.compose([Validators.required])),
            taskDesc: new FormControl(controlValue.taskDesc || '', Validators.compose([Validators.required])),
            estHr: new FormControl(controlValue.estHr || null, Validators.compose([
                Validators.required,
                Validators.pattern(/^(0?[0-9]|1[0-2]):[0-5][0-9]$/)])),
            // Validators.pattern(/^\s*(?=.*[1-9])\d{0,1}(?:\.\d{1,2})?\s*$/)])),
            taskId: new FormControl(controlValue.taskId || null),
            actualHr: new FormControl(
                (controlValue.actualHr === '00:00' ||
                    controlValue.actualHr === '0:0' ||
                    controlValue.actualHr === '0:00' ? null : controlValue.actualHr) || null),
            status: new FormControl(controlValue.status || null),
            isTrackerUsed: new FormControl(controlValue.isTrackerUsed || false),
            eodComments: new FormControl(controlValue.eodComments || ''),
            type: new FormControl('TASK'),
        });
    }

    changeControlValue(controlName?: any, index?: any) {

        this.backendError = null;
        this.hourError = '';
        this.isBtnDissabled = false;

        if (this.isNewtaskDissabled) {
            this.isBtnDissabled = true;
        }

        if (controlName === 'actualHr') {
            this.totalHoursCalculation();
        }

        if (controlName === 'Status') {
            if (this.projectDetail.value[index]['status'] === 3) {
                this.projectDetail.controls[index][`controls`]['actualHr'].clearValidators();
                this.projectDetail.controls[index][`controls`]['actualHr'].updateValueAndValidity();
            }
        }
    }

    // bind task dropdown
    getTaskByProjectId(selectedValue) {
        return this.taskByProjectID[selectedValue] || [];
    }

    get projectDetail(): FormArray {
        return this.taskForm.get('timesheet') as FormArray;
    }

    async deleteTask(index) {

        this.backendError = null;
        this.hourError = null;
        this.isBtnDissabled = false;

        await (<FormArray>this.projectDetail).removeAt(index);
        const newData = [...(this.projectDetail.value)];
        await this.projectDetail.clear();

        await setTimeout(() => {
            if ((newData).length === 0) {
                this.taskForm.reset();
                this.submitted = false;
                this.projectDetail.push(this.addNewControlWithValue());
            } else {
                newData.forEach((element) => {
                    (<FormArray>this.projectDetail).push(this.addNewControlWithValue(element));
                });
            }
        }, 500);

        await setTimeout(() => {
            this.getUniqueProjects();
            this.totalHoursCalculation();
        }, 500);
    }

    showHideControls() {
        this.displayEODFields = this.taskForm.value.eodUpdate;
        const taskControlArr = this.projectDetail.controls;

        if (this.displayEODFields) {
            this.isBtnDissabled = false;
            taskControlArr.forEach((element) => {

                const actualHr = element.get('actualHr');
                const status = element.get('status');

                actualHr.setValidators([Validators.required,
                Validators.pattern(/^(0?[0-9]|1[0-2]):[0-5][0-9]$/)]);
                status.setValidators([Validators.required]);
                status.updateValueAndValidity();

            });

            this.getUniqueProjects();
        } else {

            taskControlArr.forEach((element) => {
                const actualHr = element[`controls`][`actualHr`];
                const status = element[`controls`][`status`];

                element[`controls`][`actualHr`].setValue(null);
                element[`controls`][`status`].setValue(null);
                element[`controls`][`isTrackerUsed`].setValue(null);
                element[`controls`][`eodComments`].setValue(null);

                actualHr.clearValidators();
                actualHr.updateValueAndValidity();

                status.clearValidators();
                status.updateValueAndValidity();
            });
        }
    }

    trackByIndex(index) {
        return index;
    }

    // Start Leave hours code
    close() {
        this.modalService.dismissAll();
    }

    fillLeaveHours(content, isedit) {
        this.config.backdrop = 'static';
        this.config.keyboard = false;

        this.isEditLeaveForm = isedit;
        this.fillLeaveSubmitted = false;
        this.modalService.open(content);

        if (!this.isEditLeaveForm) {
            this.fillLeaveForm.reset();
        }
    }

    saveAbsentData() {
        this.fillLeaveSubmitted = true;

        if (!this.fillLeaveForm.valid) {
            return;
        }
        const formValue = this.fillLeaveForm.value;
        formValue['type'] = 'LEAVE';

        if (this.isEditLeaveForm) {
            for (const key in this.reason) {
                if (this.reason[key]['id'] === formValue['reasonId']) {
                    formValue['leaveReason'] = this.reason[key]['title'];
                }
            }
            this.finalLeaveHoursArr.push(formValue);
        } else {
            const selectedIndexData = this.finalLeaveHoursArr[this.editLeaveIndex];

            selectedIndexData['reasonId'] = formValue['reasonId'];
            selectedIndexData['leaveNotes'] = formValue['leaveNotes'];
            selectedIndexData['actualHr'] = formValue['actualHr'];

            for (const key in this.reason) {
                if (this.reason[key]['id'] === selectedIndexData['reasonId']) {
                    selectedIndexData['leaveReason'] = this.reason[key]['title'];
                }
            }
        }

        // totalLeaveHours
        this.totalHoursCalculation();
        this.modalService.dismissAll();
        this.fillLeaveSubmitted = false;
        this.fillLeaveForm.reset();
        this.isEditLeaveForm = false;
        this.editLeaveIndex = null;
    }

    editLeaveHours(index) {
        this.editLeaveIndex = index;
        this.fillLeaveForm.patchValue({
            reasonId: this.finalLeaveHoursArr[index]['reasonId'],
            leaveReason: this.finalLeaveHoursArr[index]['leaveReason'],
            leaveNotes: this.finalLeaveHoursArr[index]['leaveNotes'],
            actualHr: this.finalLeaveHoursArr[index]['actualHr'],
            type: 'LEAVE'
        });
    }

    deleteLeaveHours(index) {
        this.finalLeaveHoursArr.splice(index, 1);
    }

    totalHoursCalculation() {

        const spentTimeArr = [];
        const leaveTimeArr = [];
        this.hourError = null;

        this.taskForm.value['timesheet'].forEach(element => {
            spentTimeArr.push(element['actualHr']);
        });

        this.finalLeaveHoursArr.forEach(element => {
            leaveTimeArr.push(element['actualHr']);
        });

        this.totalSpentTime = moment.duration('00:00');
        spentTimeArr.forEach(element => {
            this.totalSpentTime = this.totalSpentTime.add(moment.duration(element));
        });

        this.totalLeaveTime = moment.duration('00:00');
        leaveTimeArr.forEach(element => {
            this.totalLeaveTime = this.totalLeaveTime.add(moment.duration(element));
        });

        if (this.totalSpentTime) {
            const getSpentTime = this.totalSpentTime['_data'];
            this.totalSpentTime = getSpentTime['hours'] + ':' + getSpentTime['minutes'];
        }
        if (this.totalLeaveTime) {
            const getLeaveTime = this.totalLeaveTime['_data'];
            this.totalLeaveTime = getLeaveTime['hours'] + ':' + getLeaveTime['minutes'];
        }

        this.totalTime = moment.duration(this.totalSpentTime).add(this.totalLeaveTime);

        if (this.totalTime &&
            this.totalTime['_data']) {

            const finalHour = this.totalTime['_data']['hours'];

            if (finalHour >= 8) {
                this.isBtnDissabled = false;
            }

            const currentDate = new Date();
            const CurrentDay = currentDate.getDay();

            if (finalHour < 8 && CurrentDay !== 6 && this.submitted && this.displayEODFields) {
                this.hourError = 'Total hours should not be less-then 8.';
                // this.isBtnDissabled = true;
            }
            else if (finalHour < 4 && CurrentDay === 6 && this.submitted && this.displayEODFields) {
                this.hourError = 'Total hours should not be less-then 4.';
                // this.isBtnDissabled = true;
            }
        }
    }
    // End Leave hours code

    // Start upload file
    get fileDetail(): FormArray {
        return this.taskForm.get('projects') as FormArray;
    }

    addprojectFiles(controlValue: any = {}) {
        if (this.displayEODFields && controlValue['projectId']) {
            return this.formBuilder.group({
                projectId: new FormControl(controlValue['projectId'] || null),
                projectName: new FormControl(controlValue['projectName'] || null),
                files: new FormControl(controlValue['files'] || []),
                binaryValues: new FormControl([])
            });
        }
    }

    getUniqueProjects() {
        if (this.displayEODFields && !this.isNewtaskDissabled) {


            this.fileDetail.reset();
            this.isBtnDissabled = false;

            const projects = [...this.projectDetail.value];

            const uniqueProjectIds = [...new Set(projects.map(obj => Number(obj.projectId)))];

            uniqueProjectIds.forEach(uniquId => {
                this.projectList.forEach(async (element) => {
                    if (element && element['projectId'] === Number(uniquId)) {
                        await this.fileDetail.push(this.addprojectFiles(element));
                    }
                });
            });
            setTimeout(() => {
                this.fileDetail['value'].forEach(async (element, index) => {
                    if (element['projectId'] === null || !element['projectName']) {
                        await this.fileDetail['value'].splice(index, 1);
                    }
                });
            }, 100);
        }
    }

    // GetFileType(fileType) {
    //     console.log("type...", fileType);

    //  type... image/jpeg
    //  type... application/pdf
    //  type... image/png
    //  type... application/zip
    //  type... video/mp4
    //  type... text/html
    //  type... application/json

    //     switch (fileType) {
    //         case 'image/jpeg':

    //             break;

    //         default:
    //             break;
    //     }

    // }

    async onFileChange(event, index) {

        if (event.target.files && event.target.files[0]) {
            const filesAmount = event.target.files.length;

            for (let i = 0; i < filesAmount; i++) {

                const file = event.target.files[i];
                // this.GetFileType(file.type);
                // console.log('type', file.type);
                const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
                if (Number(sizeInMB) > 10) {
                    Swal.fire({
                        title: 'File size is too large to upload',
                        text: 'This file is too big. Miximum limit is 10 mb only.' +
                            'please upload file on google drive and share link in description.',
                        icon: 'error',
                        confirmButtonText: 'Ok',
                    }).then();
                } else {

                    const name = event.target.files[i].name;
                    const fileObj = this.fileDetail.value[index];

                    for (let key in fileObj) {
                        if (key === 'files') {
                            if (fileObj['files'] && fileObj['files'].length > 0) {
                                if (!fileObj['files'].includes(name)) {
                                    await fileObj['files'].push(name);
                                } else {
                                    Swal.fire({
                                        title: 'File name is already exist.',
                                        text: 'If you want to upload this file, Please rename it first.',
                                        icon: 'error',
                                        confirmButtonText: 'Ok',
                                    }).then();
                                }
                            } else {
                                if (fileObj['files']) {
                                    await fileObj['files'].push(name);
                                }
                            }
                        }
                    }

                    // setTimeout(() => {
                    var reader = new FileReader();
                    reader.onload = (event: any) => {
                        if (this.fileDetail.value[index] && this.fileDetail.value[index]['binaryValues']) {
                            this.fileDetail.value[index]['binaryValues'].push({ fileName: name, fileData: event.target.result });
                        }
                    }
                    reader.readAsDataURL(event.target.files[i]);
                    // }, 1000);
                }
            }
        }
    }

    removeFile(fileindex, projectId, fileName) {

        const fileDetailIndex = this.fileDetail.value.map(function (e) {
            return e.projectId;
        }).indexOf(projectId);

        this.fileDetail.value[fileDetailIndex]['files'].splice(fileindex, 1);

        if (this.fileDetail.value[fileDetailIndex] && this.fileDetail.value[fileDetailIndex]['binaryValues']) {
            this.fileDetail.value[fileDetailIndex]['binaryValues'].forEach((element, index) => {
                if (element['fileName'] === fileName) {
                    this.fileDetail.value[fileDetailIndex]['binaryValues'].splice(index, 1);
                }
            });
        }
    }

    DataURIToBlob(dataURI: string, filename) {

        const arr = dataURI.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, { type: mime });
    }
    // End upload file

    //Start Final submittion
    async saveTaks() {
        try {
            this.isProcessOn = true;
            if (this.displayEODFields) {
                this.finalLeaveHoursArr.forEach(element => {
                    this.projectDetail.value.push(element);
                });

                // setTimeout(() => {
                this.taskForm.value['projects'].forEach(async (element, index) => {
                    if (element['projectId'] === null || !element['projectName']) {
                        await this.taskForm.value['projects'].splice(index, 1);
                    }
                });
                this.fileDetail['value'].forEach(async (element, index) => {
                    if (element['projectId'] === null || !element['projectName']) {
                        await this.fileDetail['value'].splice(index, 1);
                    }
                });
                // }, 800);
            }

            this.projectDetail.value.forEach(element => {

                if (element['projectId']) {
                    element['projectId'] = Number(element['projectId']);
                }
                if (element['taskMasterId']) {
                    element['taskMasterId'] = Number(element['taskMasterId']);
                }
                if (element['taskId']) {
                    element['taskId'] = Number(element['taskId']);
                }
                if (element['reasonId']) {
                    element['reasonId'] = Number(element['reasonId']);
                }
                if (typeof element['estHr'] !== 'string') {
                    element['estHr'] = JSON.stringify(element['estHr']);
                }
                if (typeof element['actualHr'] !== 'string') {
                    element['actualHr'] = JSON.stringify(element['actualHr']);
                }
            });

            const formData = new FormData();

            if (this.fileDetail['value'] && this.fileDetail['value'].length > 0 && this.displayEODFields) {
                // setTimeout(() => {
                this.fileDetail['value'].forEach(async (element) => {
                    if (element['binaryValues'] && element['binaryValues'].length > 0) {
                        element['binaryValues'].forEach((file) => {
                            formData.append('files', this.DataURIToBlob(file['fileData'], file['fileName']), file['fileName']);
                        });
                    }
                    // setTimeout(() => {
                    await delete element['binaryValues'];
                    // }, 100);
                });
                // }, 100);
            }

            // setTimeout(async () => {
            await formData.append('timesheetRequestAsJson', JSON.stringify(this.taskForm.value));
            await this.dashboardService.saveTask(formData).toPromise().then(res => {
                this.isProcessOn = false;
                if (res && res[`data`]) {
                    (this.projectDetail).clear();
                    const timesheet = res[`data`][`timesheet`];

                    this.disableEod = res['data']['eodUpdate'];
                    this.isBtnDissabled = true;
                    timesheet.forEach((element) => {
                        if (element['type'] !== "LEAVE" && element['projectId']) {
                            setTimeout(() => {
                                this.projectDetail.push(this.addNewControlWithValue(element));
                            }, 100);
                        } else {
                            this.finalLeaveHoursArr = [];
                            this.finalLeaveHoursArr.push(element);
                        }
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
                this.isProcessOn = false;
                if (err && err.error) {
                    this.backendError = err.error[`errorMessage`];
                }
            });
            // }, 1500);
        } catch (error) {
            this.isProcessOn = false;
            console.log("err...", error);
        }
    }

    async onSubmit(displayPreview, content) {
        this.submitted = true;
        if (!this.taskForm.valid) {
            return;
        }
        this.backendError = null;

        if (displayPreview && !content) {
            this.modalService.dismissAll();
            this.isBtnDissabled = true;

            if (this.taskForm.value['eodUpdate']) {

                setTimeout(() => {
                    this.taskForm.value['projects'].forEach(async (element, index) => {
                        if (element['projectId'] === null || !element['projectName']) {
                            await this.taskForm.value['projects'].splice(index, 1);
                        }
                    });
                    this.fileDetail['value'].forEach(async (element, index) => {
                        if (element['projectId'] === null || !element['projectName']) {
                            await this.fileDetail['value'].splice(index, 1);
                        }
                    });
                }, 800);

                await this.totalHoursCalculation();

                if (!this.hourError) {
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

            if (!this.taskForm.valid) {
                return;
            }

            this.taskForm.value['timesheet'].forEach(element => {
                if ((element['status'] === 1 || element['status'] === 2) && !element['actualHr']) {
                    this.modalService.dismissAll();
                    this.backendError = 'Please provide spent hour if status is COMPLETED/INPROGRESS';
                }
            });

            if (!this.backendError) {

                const requestPayload = { timesheet: this.taskForm.value['timesheet'] };

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
    // End Final submittion

}

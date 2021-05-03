import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../service/dashboard.service';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-master-task',
    templateUrl: './master-task.component.html',
    styleUrls: ['./master-task.component.css']
})
export class MasterTaskComponent implements OnInit {

    projectList = [];
    masterTaskList = [];
    selectedProject = [];
    addTaskForm: FormGroup;
    editTaskForm: FormGroup;
    addTaskSubmitted = false;
    isEditForm = false;

    constructor(
        private dashboardService: DashboardService,
        private formBuilder: FormBuilder,
        private modalService: NgbModal,
        private config: NgbModalConfig,
    ) { }

    ngOnInit(): void {

        this.getProject();

        this.addTaskForm = this.formBuilder.group({
            projectId: new FormControl(null),
            masterTaskId: new FormControl(0),
            masterTaskTitle: new FormControl('', Validators.compose([Validators.required])),
        });
    }

    getProject() {
        this.dashboardService.getProjectsAndTask().toPromise().then(res => {
            this.projectList = res['data'];
        }).catch(err => { });
    }

    async getTaskList(projectId) {
        this.masterTaskList = [];
        this.selectedProject = [];
        console.log("------------------------------------------", this.projectList);

        this.selectedProject = await this.projectList.filter(function (e) {
            return e['projectId'] === projectId;
        });
        console.log("this.selectedProject.", this.selectedProject);

        if (this.selectedProject.length > 0 && this.selectedProject[0]['taskMasters']) {
            this.masterTaskList = this.selectedProject[0]['taskMasters'];
        } else {
            this.masterTaskList = [];
        }
    }

    addTask(content, formtype, editTaskData) {

        this.config.backdrop = 'static';
        this.config.keyboard = false;
        this.addTaskForm.reset();

        this.modalService.open(content);
        this.isEditForm = formtype;

        const taskControls = this.addTaskForm.controls;
        // console.log("taskControlArr...", taskControls);

        if (!this.isEditForm) {
            taskControls['projectId'].setValidators([Validators.required]);
            taskControls['projectId'].updateValueAndValidity();
            this.addTaskForm.patchValue({ masterTaskId: 0 });
        }

        if (editTaskData) {
            this.addTaskForm.patchValue({
                projectId: 0,
                masterTaskId: editTaskData['taskMasterId'],
                masterTaskTitle: editTaskData['taskMasterTitle']
            });
        }
    }

    async saveData() {
        this.addTaskSubmitted = true;

        if (!this.addTaskForm.valid) {
            return;
        }

        // console.log("this.addtask...", this.addTaskForm.value);

        await this.dashboardService.addEditMasterTask(this.addTaskForm.value).toPromise().then(async res => {
            if (res) {

                this.projectList = [];

                this.dashboardService.getProjectsAndTask().toPromise().then(result => {
                    this.projectList = result['data'];
                    if (res['data'] && res['data']['projectId']) {
                        this.getTaskList(res['data']['projectId']);
                    }
                }).catch(err => { });

                this.modalService.dismissAll();
                this.addTaskForm.reset();

                Swal.fire({
                    text: 'Task Added Successfully.',
                    icon: 'success',
                    confirmButtonText: 'Ok',
                }).then();
            }
        }).catch(err => { });
    }

}

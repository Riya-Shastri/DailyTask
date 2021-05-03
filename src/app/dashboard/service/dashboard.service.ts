import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ManageDateService } from './manage-date.service';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {

    constructor(
        private http: HttpClient,
        private manageDate: ManageDateService
    ) { }

    getProjectsAndTask() {
        return this.http.get('/projects/taskmasters');
    }

    getAllSaveTask() {
        return this.http.get('/tasks');
    }

    getAllTaskForDropdown(projectId) {
        return this.http.get('/projects/' + projectId + '/taskmasters');
    }

    saveTask(requestPayload) {
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'multipart/form-data'
            })
        };
        return this.http.post('/tasks', requestPayload, httpOptions);
    }

    getProject() {
        return this.http.get('/projects/byprojecthead');
    }

    getUserByProjects(projectId) {
        return this.http.get('/projects/' + projectId + '/users ');
    }

    getTaskdetail(requestPayoad) {

        if (typeof requestPayoad[`fromDate`] === 'object') {
            requestPayoad[`fromDate`] = this.manageDate.objectToDate(requestPayoad.fromDate);
            requestPayoad[`toDate`] = this.manageDate.objectToDate(requestPayoad.toDate);
        }

        // const finalFieldsToShow = [];
        // if (requestPayoad['fieldsToShow'] &&
        //     requestPayoad['fieldsToShow'].length > 0) {
        //     requestPayoad['fieldsToShow'].forEach(element => {
        //         if (!finalFieldsToShow.includes(element['item_id'])) {
        //             finalFieldsToShow.push(element['item_id']);
        //         }
        //     });
        // }

        // requestPayoad['fieldsToShow'] = finalFieldsToShow;

        return this.http.post('/tasks/report', requestPayoad);
    }

    saveGoogleLink(requestPayload, projectId) {
        return this.http.post('/projects/' + projectId, requestPayload);
    }

    previewEmail(requestPayload) {
        return this.http.post('/tasks/generate-email-preview', requestPayload);
    }

    addEditMasterTask(requestPayload) {
        return this.http.post('/tasks/taskmaster', requestPayload);
    }

}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SettingService {

    constructor(
        private http: HttpClient,
    ) { }

    getProjects() {
        return this.http.get('/projects/');
    }

    getUserByProject(projectId) {
        return this.http.get('/projects/' + projectId + '/email-settings');
    }

    saveEmailSetting(requestPayload, projectId) {
        return this.http.post('/projects/' + projectId + '/email-settings', requestPayload);
    }

}

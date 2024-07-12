import axios, { AxiosInstance } from 'axios';
import { getInputs } from './action-inputs';
import { JIRA, JIRADetails } from './types';

export class JiraConnector {
  client: AxiosInstance;
  JIRA_TOKEN: string;
  JIRA_BASE_URL: string;

  constructor() {
    const { JIRA_TOKEN, JIRA_BASE_URL } = getInputs();

    this.JIRA_BASE_URL = JIRA_BASE_URL;
    this.JIRA_TOKEN = JIRA_TOKEN;

    const encodedToken = Buffer.from(JIRA_TOKEN).toString('base64');

    this.client = axios.create({
      baseURL: `${JIRA_BASE_URL}/rest/api/3`,
      timeout: 2000,
      headers: { Authorization: `Basic ${encodedToken}` },
    });
  }

  async getTicketDetails(key: string): Promise<JIRADetails> {
    console.log(`Fetching ${key} details from JIRA`);

    try {
      const issue: JIRA.Issue = await this.getIssue(key);
      const {
        fields: { issuetype: type, project, summary },
      } = issue;

      return {
        key,
        summary,
        url: `${this.JIRA_BASE_URL}/browse/${key}`,
        type: {
          name: type.name,
          icon: type.iconUrl,
        },
        project: {
          name: project.name,
          url: `${this.JIRA_BASE_URL}/browse/${project.key}`,
          key: project.key,
        },
      };
    } catch (error) {
      console.log(
        'Error fetching details from JIRA. Please check if token you provide is built correctly & API key has all needed permissions. https://github.com/cakeinpanic/jira-description-action#jira-token'
      );
      if (error.response) {
        throw new Error(JSON.stringify(error.response.data, null, 4));
      }
      throw error;
    }
  }

  async getSprintDetails(id: string): Promise<JIRADetails[]> {
    console.log(`Fetching sprint with id ${id} details from JIRA`);

    try {
      const sprint: JIRA.Sprint = await this.getSprintIssues(id);

      return sprint.issues.map((issue) => {
        const {
          fields: { issuetype: type, project, summary },
        } = issue;

        return {
          key: issue.key,
          summary,
          url: `${this.JIRA_BASE_URL}/browse/${issue.key}`,
          type: {
            name: type.name,
            icon: type.iconUrl,
          },
          project: {
            name: project.name,
            url: `${this.JIRA_BASE_URL}/browse/${project.key}`,
            key: project.key,
          },
        };
      });
    } catch (error) {
      console.log(
        'Error fetching details from JIRA. Please check if token you provide is built correctly & API key has all needed permissions. https://github.com/cakeinpanic/jira-description-action#jira-token'
      );
      if (error.response) {
        throw new Error(JSON.stringify(error.response.data, null, 4));
      }
      throw error;
    }
  }

  async getIssue(id: string): Promise<JIRA.Issue> {
    const url = `/issue/${id}?fields=project,summary,issuetype`;
    const response = await this.client.get<JIRA.Issue>(url);
    return response.data;
  }

  async getSprintIssues(id: string): Promise<JIRA.Sprint> {
    const url = `/search?jql=sprint%20%3D%20%${id}%20and%20issuetype%20NOT%20IN%20(%22Technical%20task%22)&fields=summary,issuetype`;
    const response = await this.client.get<JIRA.Sprint>(url);
    return response.data;
  }
}

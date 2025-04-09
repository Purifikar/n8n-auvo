import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class auvoCredentialsApi implements ICredentialType {
	name = 'auvoCredentialsApi';
	displayName = 'Auvo Credentials API';
	documentationUrl = 'https://api.auvo.com.br/';
	properties: INodeProperties[] = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Auvo API URL',
			name: 'auvoApiUrl',
			type: 'string',
			default: 'https://api.auvo.com.br/v2',
		},
	];

	// this automatically tests the credentials
	// and shows message `Connection tested successfully` if successful
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.auvo.com.br',
			url: '/v2/login/',
			method: 'GET',
			qs: {
				apiKey: '={{$credentials.apiKey}}',
				apiToken: '={{$credentials.apiToken}}',
			},
		},
	};

}
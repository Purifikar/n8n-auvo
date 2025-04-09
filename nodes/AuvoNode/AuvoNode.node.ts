/// <reference lib="dom" />
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class AuvoNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Auvo Node',
		name: 'auvoNode',
		group: ['transform'],
		icon: 'file:auvo.svg',
		version: 1,
		description: 'Basic Auvo Node',
		defaults: {
			name: 'Auvo Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'auvoCredentialsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{ name: 'Retrieve', value: 'retrieve' },
					// { name: 'Create', value: 'create' },
					// { name: 'Update', value: 'update' },
					// { name: 'Delete', value: 'delete' },
				],
				default: 'retrieve',
			},
			{
				displayName: 'paramFilter',
				name: 'paramFilter',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['retrieve'],
					},
				},
				placeholder: "{ id: 14836218}",
				description: "Filters like internal id, others ...",
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						operation: ['retrieve'],
					},
				},
				description: "Page of the selection. Default 1.",
			},
			{
				displayName: 'PageSize',
				name: 'pageSize',
				type: 'number',
				default: 10,
				displayOptions: {
					show: {
						operation: ['retrieve'],
					},
				},
				description: "Amount of records of the selection. Default 10.",
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'string',
				default: 'asc',
				displayOptions: {
					show: {
						operation: ['retrieve'],
					},
				},
				description: "Order of the selection. Default asc.",
			},
			{
				noDataExpression: true,
				displayName: 'Entity',
				name: 'entity',
				type: 'options',
				required: true,
				default: 'customers',
				options: [
					{
						name: 'Customers',
						value: 'customers',
					},
					{
						name: 'Webhooks',
						value: 'webHooks',
					},
					{
						name: 'Tasks',
						value: 'tasks',
					},
					{
						name: 'Teams',
						value: 'teams',
					},
					{
						name: 'Products',
						value: 'products',
					},
				],
				displayOptions: {
					show: {
						operation: ['retrieve'],
					},
				},
				description: "Entity to retrieve like Customers, webHooks, etc.",
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let operation = this.getNodeParameter('operation', 0);
		let response = null;

		const credentials = await this.getCredentials('auvoCredentialsApi') as {
			apiKey: string;
			apiToken: string;
			auvoApiUrl: string;
		};
		// Step 1: Get accessToken
		const loginRes = await this.helpers.httpRequest(
			{
				baseURL: credentials.auvoApiUrl,
				method: 'GET', // or POST, PUT, DELETE
				url: 'login/',
				qs: {
					apiKey: credentials.apiKey,
					apiToken: credentials.apiToken,
				},
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		const accessToken = loginRes.result.accessToken;

		if (!accessToken) {
			throw new NodeOperationError(this.getNode(), `Failed to retrieve accessToken from Auvo. ${loginRes.data}`);
		}

		switch (operation) {
			case 'retrieve':
				const entity = this.getNodeParameter('entity', 0, '') as string;
				console.log(`entity: ${entity}`);
				const paramFilter = encodeURIComponent(this.getNodeParameter('paramFilter', 0, '') as string);
				// from api docs for entity webHooks
				// curl --include \
				//    --header "Content-Type: application/json" \
				//    --header "Authorization: Bearer token" \
				// 'https://api.auvo.com.br/v2/webHooks/?paramFilter={paramFilter}&page={page}&pageSize={pageSize}&order={order}'
				response = await this.helpers.httpRequest(
					{
						baseURL: credentials.auvoApiUrl,
						url: `${entity}/`,
						qs: { // query params
							paramFilter: paramFilter,
							page: this.getNodeParameter('page', 0, 1) as number,
							pageSize: this.getNodeParameter('pageSize', 0, 10) as number,
							order: this.getNodeParameter('order', 0, 'asc') as string,
						},
						method: 'GET', // or POST, PUT, DELETE
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					}
				);
				break;
			default:
				throw new NodeOperationError(this.getNode(), 'Invalid operation.');
		}

		return [this.helpers.returnJsonArray(response)];

	}
}

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
					{ name: 'Create', value: 'create' },
					{ name: 'Create or Update', value: 'upsert' },
					// { name: 'Update', value: 'update' },
					// { name: 'Delete', value: 'delete' },
				],
				default: 'retrieve',
			},
			// Retrive Parameters
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
				placeholder: "{ id: 14836218 }",
				description: "Filters like internal id, others like name, email, etc",
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
				description: "Page of the selection",
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
				description: "Amount of records of the selection",
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
				description: "Order of the selection asc. for ascending or desc. for descending",
			},
			// Create Parameters
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'string',
				required: true,
				default: '',
				placeholder: "{ externalId: '1234567890', name: 'John Doe', active: 'true' }",
				displayOptions: {
					show: {
						operation: ['create', 'upsert'],
					},
				},
				description: "Attributes of the entity to create or update.\nRefer to the API documentation for the entity to know the attributes",
			},
			// Entities
			{
				displayName: 'Entity',
				noDataExpression: true,
				name: 'entity',
				type: 'options',
				required: true,
				default: 'customers',
				options: [
					{
						name: 'Customer Groups',
						value: 'customerGroups',
					},
					{
						name: 'Customers',
						value: 'customers',
					},
					{
						name: 'GPS',
						value: 'gps',
					},
					{
						name: 'Products',
						value: 'products',
					},
					// {
					// 	name: 'Segments',
					// 	value: 'segments', // segments not working 404
					// },
					{
						name: 'Task Types',
						value: 'taskTypes',
					},
					{
						name: 'Tasks',
						value: 'tasks', // tasksing must set start-date and end-date
					},
					{
						name: 'Teams',
						value: 'teams',
					},
					{
						name: 'Users',
						value: 'users',
					},
					{
						name: 'Webhooks',
						value: 'webHooks',
					},
				],
				displayOptions: {
					show: {
						operation: ['retrieve', 'create', 'upsert'],
					},
				},
				description: "Entity to perform operation",
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
		// Get parameters
		const entity = this.getNodeParameter('entity', 0, '') as string;
		const attributes = this.getNodeParameter('attributes', 0, '') as string;
		const paramFilter = this.getNodeParameter('paramFilter', 0, '') as string;

		if (!accessToken) {
			throw new NodeOperationError(this.getNode(), `Failed to retrieve accessToken from Auvo. ${loginRes.data}`);
		}

		switch (operation) {
			case 'retrieve':
				console.log(`entity: ${entity}`);
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
							paramFilter: encodeURIComponent(paramFilter),
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
			case 'create':
			// from api docs for entity customers
			// https://auvoapiv2.docs.apiary.io/#reference/customers/customer/add-a-new-customer
				response = await this.helpers.httpRequest(
					{
						baseURL: credentials.auvoApiUrl,
						url: `${entity}/`,
						method: 'POST',
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
						body: attributes,
					}
				);
				break;
			case 'upsert':
				// from api docs for entity customers
				// https://auvoapiv2.docs.apiary.io/#reference/customers/customer/upsert-add-a-new-customer-or-update-an-existing-one
				response = await this.helpers.httpRequest(
					{
						baseURL: credentials.auvoApiUrl,
						url: `${entity}/`,
						method: 'PUT',
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
						body: attributes,
					}
				);
				break;
			default:
				throw new NodeOperationError(this.getNode(), 'Invalid operation.');
		}

		return [this.helpers.returnJsonArray(response)];

	}
}

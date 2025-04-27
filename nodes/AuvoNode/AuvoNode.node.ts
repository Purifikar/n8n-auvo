/// <reference lib="dom" />
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class AuvoNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Auvo',
		name: 'auvoNode',
		group: ['transform'],
		icon: 'file:auvo.svg',
		version: 1,
		description: 'Auvo API',
		defaults: {
			name: 'Auvo',
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
					{ name: 'Delete', value: 'delete' },
				],
				default: 'retrieve',
			},
			// Retrive Parameters
			{
				displayName: 'paramFilter',
				name: 'paramFilter',
				type: 'json',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['retrieve'],
					},
				},
				placeholder: "{ id: 14836218 }",
				description: "JSON object to filter by attributes like active, id, name, creationDate, email, etc. \nRefer to the API documentation for the entity to know the attributes. \nFor Tasks: it's mandatory to set startDate and endDate",
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
				type: 'json',
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
			// Delete Parameters
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				description: "ID of the entity to delete",
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
						value: 'tasks', // tasks must set startDate and endDate
						description: "Must set startDate and endDate",
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
						name: 'WebHooks',
						value: 'webHooks',
					},
				],
				displayOptions: {
					show: {
						operation: ['retrieve', 'create', 'upsert', 'delete'],
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

		async function safeParse(value: unknown, field: string, node: INode): Promise<IDataObject> {
			if (typeof value !== 'string' && !(value instanceof String)) return value as IDataObject;
			try {
				return JSON.parse(value as string);
			} catch {
				throw new NodeOperationError(node, `${field} is not valid JSON`);
			}
	}

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
		// Get parameters
		const entity = this.getNodeParameter('entity', 0, '') as string;
		const id = this.getNodeParameter('id', 0, '') as string;
		var attributes = this.getNodeParameter('attributes', 0, {});
		var paramFilter = this.getNodeParameter('paramFilter', 0, {});
		// convert from string to json if it's a string
		// foolproof for user input
		paramFilter = await safeParse(paramFilter, 'paramFilter', this.getNode());
		attributes = await safeParse(attributes, 'attributes', this.getNode());

		switch (operation) {
			case 'retrieve':
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
							paramFilter: encodeURIComponent(JSON.stringify(paramFilter)),
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
			case 'delete':
				// from api docs for entity customers
				// https://auvoapiv2.docs.apiary.io/#reference/customers/customer/delete-a-customer
				response = await this.helpers.httpRequest(
					{
						baseURL: credentials.auvoApiUrl,
						url: `${entity}/${id}`,
						method: 'DELETE',
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

		return [this.helpers.returnJsonArray({status: response.status, data: response.result})];

	}
}

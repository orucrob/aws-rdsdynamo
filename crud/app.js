const AWS = require('aws-sdk')
const uuidv4 = require('uuid/v4')
const DDB = new AWS.DynamoDB({ apiVersion: '2012-10-08' })
const unmarshall = AWS.DynamoDB.Converter.unmarshall

// params
const TABLE_NAME = process.env.TABLE_NAME
const DEBUG = (process.env.DEBUG + '').toLowerCase() === 'true'

/**
 *
 * process event from API gateway for CRUD operations
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {Object} context
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
exports.lambdaHandler = async (event, context) => {
    DEBUG && console.log('Received event:', JSON.stringify(event, null, 2))

    //  parameters
    let httpMethod = event.httpMethod
    let id = (event.pathParameters || {}).id

    // process
    try {
        if (httpMethod === 'GET') {
            var getPar = {
                TableName: TABLE_NAME,
                Key: {
                    id: {
                        S: id
                    }
                }
            }
            let resp = await DDB.getItem(getPar).promise()
            return {
                statusCode: 200,
                body: JSON.stringify(unmarshall(resp.Item))
            }
        } else if (httpMethod === 'DELETE') {
            var delPar = {
                TableName: TABLE_NAME,
                Key: {
                    id: {
                        S: id
                    }
                }
            }
            let resp = await DDB.deleteItem(delPar).promise()
            return {
                statusCode: 200,
                body: JSON.stringify(resp)
            }
        } else {
            let text = parseBody(event).text
            if (httpMethod === 'POST') {
                let insertParams = {
                    TableName: TABLE_NAME,
                    ExpressionAttributeNames: {
                        '#T': 'text',
                        '#C': 'created'
                    },
                    ExpressionAttributeValues: {
                        ':T': {
                            S: text
                        },
                        ':C': { S: new Date().toISOString() }
                    },
                    Key: {
                        id: {
                            S: uuidv4()
                        }
                    },
                    UpdateExpression: 'SET #C = :C' + (text ? ', #T = :T' : ''),
                    ReturnValues: 'ALL_NEW'
                }
                let resp = await DDB.updateItem(insertParams).promise()
                return {
                    statusCode: 200,
                    body: JSON.stringify(unmarshall(resp.Attributes))
                }
            } else if (httpMethod === 'PUT') {
                var updateParams = {
                    TableName: TABLE_NAME,
                    ExpressionAttributeNames: {
                        '#T': 'text',
                        '#U': 'updated'
                    },
                    ExpressionAttributeValues: {
                        ...(text && {
                            ':T': {
                                S: text
                            }
                        }),
                        ':U': { S: new Date().toISOString() }
                    },
                    Key: {
                        id: {
                            S: id
                        }
                    },
                    UpdateExpression: 'SET #U = :U' + (text ? ', #T = :T' : ' REMOVE #T'),
                    ConditionExpression: 'attribute_exists(id)',
                    ReturnValues: 'ALL_NEW'
                }
                console.log('udpate params: ' + JSON.stringify(updateParams, null, 2))
                let resp = await DDB.updateItem(updateParams).promise()
                return {
                    statusCode: 200,
                    body: JSON.stringify(unmarshall(resp.Attributes))
                }
            }
        }
    } catch (err) {
        console.log('Unable to process DB request.' + err)
        return {
            statusCode: err.name === '400' ? 400 : 500,
            body: 'Failed to process request: ' + err
        }
    }
}

const parseBody = event => {
    let text
    // get text from body
    try {
        let body = JSON.parse(event.body)
        if (body.text === undefined) {
            DEBUG && console.log('Body doesn\'t contain required "text" attribute', JSON.stringify(body, null, 2))
            let wrapE = new Error(`Required "text" attribute missing in body.`)
            wrapE.name = '400'
            throw wrapE
        } else {
            text = body.text
        }
    } catch (e) {
        DEBUG && console.log('Body is not valid JSON', JSON.stringify(e, null, 2))
        let wrapE = new Error(`Wrong body. ${e}`)
        wrapE.name = '400'
        throw wrapE
    }

    return {
        text
    }
}

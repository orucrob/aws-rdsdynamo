const AWS = require('aws-sdk')

// Add RDSDataService to the AWS namespace - current version 2.437.0 ; required:  2.466.0
// This is a temporary "fix" to provide the SDK until it becomes available in lambda runtime
require('aws-sdk/clients/rdsdataservice')
const RDS = new AWS.RDSDataService()

const SECRET_ARN = process.env.SECRET_ARN
const DB_ARN = process.env.DB_ARN
const TABLE_NAME = process.env.TABLE_NAME
const DB_NAME = process.env.DB_NAME

exports.handler = function (event, context) {
    console.log('EVENT:', JSON.stringify(event, null, 2))
    createTable()
        .then(data => send(event, context, 'SUCCESS', { Status: 'Table created' }))
        .catch(err => send(event, context, 'FAILED', { Status: 'Error: ' + err }))

    console.log('DONE')
}

const createTable = () => {
    return new Promise((resolve, reject) => {
        let sql = `
                CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                    id VARCHAR(255) NOT NULL,
                    text VARCHAR(255),
                    created VARCHAR(255),
                    updated VARCHAR(255),
                    PRIMARY KEY (id)
                )`
        console.log('SQL to execute:', sql)

        const params = {
            secretArn: SECRET_ARN,
            resourceArn: DB_ARN,
            sql,
            database: DB_NAME
        }

        RDS.executeStatement(params, (err, data) => {
            if (err) {
                console.log(err)
                let errW = new Error('Unable to create table: ' + err)
                errW.name = 'DBError'
                reject(errW)
            } else {
                console.log('updated:', JSON.stringify(data, null, 2))
                resolve(data)
            }
        })
    })
}

const send = function (event, context, responseStatus, responseData, physicalResourceId, noEcho) {
    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
        PhysicalResourceId: physicalResourceId || context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        NoEcho: noEcho || false,
        Data: responseData
    })

    console.log('Response body:\n', responseBody)

    var https = require('https')
    var url = require('url')

    // eslint-disable-next-line node/no-deprecated-api
    var parsedUrl = url.parse(event.ResponseURL)
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': responseBody.length
        }
    }
    console.log('Options:\n', options)
    var request = https.request(options, function (response) {
        console.log('Status code: ' + response.statusCode)
        console.log('Status message: ' + response.statusMessage)
        if (response.statusCode === 400 && responseStatus === 'SUCCESS') {
            send(event, context, 'FAILED')
        } else {
            context.done()
        }
    })

    request.on('error', function (error) {
        console.log('send(..) failed executing https.request(..): ' + error)
        context.done()
    })

    request.write(responseBody)
    request.end()
}

const AWS = require('aws-sdk')

// Add RDSDataService to the AWS namespace - current version 2.437.0 ; required:  2.466.0
// This is a temporary "fix" to provide the SDK until it becomes available in lambda runtime
require('aws-sdk/clients/rdsdataservice')
const RDS = new AWS.RDSDataService()

const SECRET_ARN = process.env.SECRET_ARN
const DB_ARN = process.env.DB_ARN
const TABLE_NAME = process.env.TABLE_NAME
const DB_NAME = process.env.DB_NAME

let response
exports.lambdaHandler = async (event, context) => {
    try {
        const params = {
            secretArn: SECRET_ARN,
            resourceArn: DB_ARN,
            sql: `SELECT id, text, created, updated FROM ${TABLE_NAME}`,
            database: DB_NAME
        }

        let data = await RDS.executeStatement(params).promise()
        console.log(JSON.stringify(data, null, 2))

        let retData = (data.records || []).map(rdsRec => ({
            id: rdsRec[0].stringValue,
            text: rdsRec[1].stringValue,
            created: rdsRec[2].stringValue,
            modified: rdsRec[3].stringValue
        }))

        console.log(JSON.stringify(retData, null, 2))

        response = {
            statusCode: 200,
            body: JSON.stringify(retData)
        }
    } catch (err) {
        console.log(err)
        return err
    }

    return response
}

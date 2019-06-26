const AWS = require('aws-sdk')
const unmarshall = AWS.DynamoDB.Converter.unmarshall

// Add RDSDataService to the AWS namespace - current version 2.437.0 ; required:  2.466.0
// This is a temporary "fix" to provide the SDK until it becomes available in lambda runtime
require('aws-sdk/clients/rdsdataservice')
const RDS = new AWS.RDSDataService()

const SECRET_ARN = process.env.SECRET_ARN
const DB_ARN = process.env.DB_ARN
const TABLE_NAME = process.env.TABLE_NAME
const DB_NAME = process.env.DB_NAME

// TODO : batch updates to DB
exports.lambdaHandler = async (event, context) => {
    try {
        let record
        for (let i = 0; i < event.Records.length; i++) {
            record = event.Records[i]
            console.log('Stream record: ', JSON.stringify(record, null, 2))
            let item = unmarshall(record.dynamodb.NewImage)
            if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
                await upsertItem(item)
            } else if (record.eventName === 'REMOVE') {
                await deleteItem(item)
            }
        }
    } catch (err) {
        console.log(err)
        return err
    }

    return `Successfully processed ${event.Records.length} records.`
}

const upsertItem = async ({ id, created = '', updated = '', text = '' }) => {
    try {
        let sql = `INSERT INTO ${TABLE_NAME} (id, text, created, updated) VALUES("${id}", "${text}", "${created}","${updated}") 
                    ON DUPLICATE KEY UPDATE id="${id}", text="${text}", updated="${updated}"`

        // TODO WTF??? empty string needs to be in single quote???
        sql = sql.replace(/""/g, `''`)
        console.log('SQL:', sql)

        const params = {
            secretArn: SECRET_ARN,
            resourceArn: DB_ARN,
            sql,
            database: DB_NAME
        }

        let data = await RDS.executeStatement(params).promise()

        console.log('updated:', JSON.stringify(data, null, 2))
        return true
    } catch (err) {
        console.log(err)
        return false
    }
}
const deleteItem = async ({ id }) => {
    try {
        // const ret = await axios(url);
        const params = {
            secretArn: SECRET_ARN,
            resourceArn: DB_ARN,
            sql: `DELETE FROM ${TABLE_NAME} WHERE id = "${id}"`,
            database: DB_NAME
        }

        let data = await RDS.executeStatement(params).promise()

        console.log('deleted:', JSON.stringify(data, null, 2))
        return true
    } catch (err) {
        console.log(err)
        return false
    }
}

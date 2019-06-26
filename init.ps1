# Powershell.exe -ExecutionPolicy Unrestricted -File .\init.ps1

$s3Bucket = 'devops-bucket'
$profile = '--profile private'

# sam build # do not use for now - will override rdsdataservice client in functions

Write-Host "Packaging..."
Invoke-Expression "sam package --output-template-file packaged_migrate.yaml --template-file template_migrate.yaml --s3-bucket $s3Bucket $profile"

Write-Host "Deploying..."
Invoke-Expression "sam deploy --template-file .\packaged_migrate.yaml --stack-name aws-rdsdynamo-migrate --capabilities CAPABILITY_IAM, CAPABILITY_NAMED_IAM $profile"

Write-Host "Done."

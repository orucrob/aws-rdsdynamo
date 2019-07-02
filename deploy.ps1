# execute:
# Powershell.exe -ExecutionPolicy Unrestricted -File .\deploy.ps1

$s3Bucket = 'devops-bucket'
$profile = '--profile private'

# sam build # do not use for now - will override rdsdataservice client in functions
Write-Host "Building CURD..."
cd ./crud
npm install
cd ..

Write-Host "Packaging..."
Invoke-Expression "sam package --output-template-file packaged.yaml --template-file template.yaml --s3-bucket $s3Bucket $profile"

Write-Host "Deploying..."
Invoke-Expression "sam deploy --template-file .\packaged.yaml --stack-name aws-rdsdynamo --capabilities CAPABILITY_IAM, CAPABILITY_NAMED_IAM  $profile"


Write-Host "Done."

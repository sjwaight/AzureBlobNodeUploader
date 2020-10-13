const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const _ = require('lodash');
const multer = require('multer');
const MulterAzureStorage = require('multer-azure-blob-storage').MulterAzureStorage;
const azureStorageSdk = require('azure-storage');
const appInsights = require('applicationinsights');

// Application Insights setup
const appInsightsKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY || "";
appInsights.setup(appInsightsKey).start();

// Hardcoded target Azure Storage Container (top level folder)
const targetContainer = 'sampleuploads'

// 10 MB file maximum size.
const maxSize = 1024 * 1024 * 10;

const app = express();

const azureStorage = new MulterAzureStorage({
    containerName: targetContainer
});

const upload = multer({
    storage: azureStorage,
    limits: { fileSize: maxSize }
}).single('samplefile');

app.post('/upload-sample-file', (req,res) => {
    upload(req,res,(err) => {
        if(err) {
            return res.end("Error uploading file - " +  err.message + ".");
        } 
        else
        {
            // work around to set CONTENT-TYPE correctly on blob
            var blobService = azureStorageSdk.createBlobService();
            blobService.setBlobProperties(targetContainer, req.file.blobName, { contentType: req.file.mimetype}, (err) =>
                {
                    if(err)
                    {
                        console.log("Problem setting content type: " + err.message);
                    }
                });
        }
        
        console.log(req.file);
        res.redirect(`/uploaded?file=${req.file.url}`)
    });
});

// setup pug
app.set('views', './views');
app.set('view engine', 'pug');

//add other middleware
app.use(cors());
app.use(morgan('dev'));

app.get('/', (req, res) => {
	res.render('file_upload_form', { appinsightskey: appInsightsKey});
});

app.get('/uploaded', (req, res) => {
	res.render('uploaded', { appinsightskey: appInsightsKey});
});

//start app 
const port = process.env.PORT || 3000;

app.listen(port, () => 
  console.log(`App is listening on port ${port}.`)
);
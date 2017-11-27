// need run 'sudo apt-get install imagemagick ghostscript poppler-utils unoconv'

var qiniu = require('qiniu');
var express = require('express');
var globalConfig = require('./config.js');
var app = express();

function excludeSpecial(s) {
    // 去掉转义字符
    s = s.replace(/[\'\"\\\/\b\f\n\r\t]/g, '');
    // 去掉特殊字符
    s = s.replace(/[\;\/\?\:\@\=\&\<\>\"\#\%\{\}\|\\\^\~\[\]\`\ \$\￥]/g,'');
    return s;
};

var mac = new qiniu.auth.digest.Mac(globalConfig.AccessKey, globalConfig.SecretKey);
var options = {
    scope: globalConfig.Bucket,
    deleteAfterDays: 1,
    returnBody: '{"key":"$(key)","name": $(fname),"size": $(fsize),"w": $(imageInfo.width),"h": $(imageInfo.height),"hash": $(etag)}'
};
var putPolicy = new qiniu.rs.PutPolicy(options);
var bucketManager = new qiniu.rs.BucketManager(mac, null);

app.use(express.static(__dirname + '/'));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.use('js', express.static(__dirname + '/../js'));
app.use('css', express.static(__dirname + '/../css'));
app.use('images', express.static(__dirname + '/../images'));
app.use('plupload', express.static(__dirname + '/../plupload'));

app.get('/uptoken', function(req, res, next) {
    var token = putPolicy.uploadToken(mac);
    res.header("Cache-Control", "max-age=0, private, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    if (token) {
        res.json({
            uptoken: token
        });
    }
});

app.get('/', function(req, res) {
    res.render('test.html', {
        domain: globalConfig.Domain,
        uptoken_url: globalConfig.UptokenUrl
    });
});

app.get('/delete', function(req, res) {
    var params = req.query;
    if (params.bucket && params.key) {
        deleteFile(params.bucket, params.key, function(err, respBody, respInfo) {
            if (err) {
                console.log('Delete file failed! error: ', err);
                //throw err;
                res.send(err);
            } else {
                console.log('Delete file result code: ', respInfo.statusCode);
                res.send(respInfo.statusCode);
            }
        });
    }
});

var deleteFile = function(bucket, key, callback) {
    bucketManager.delete(bucket, key, callback);
}

app.listen('3060', function() {
    console.log('start server!')
});

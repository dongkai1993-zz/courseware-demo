// 上传课件

if (navigator.userAgent.indexOf('HUAWEI') != -1 || navigator.userAgent.indexOf('XiaoMi') != -1) {
    var uploader = new plupload.Uploader({
        runtimes: 'html5,flash,silverlight,html4',
        browse_button: 'officeUpload',
        // container: 'container',
        rename:true,
        // url : '../upload.php',
        url: "https://convertoffice.wilddog.com/upload",

        flash_swf_url: 'js/plupload/Moxie.swf', //引入flash,相对路径
    })
} else {
    var uploader = new plupload.Uploader({
        runtimes: 'html5,flash,silverlight,html4',
        browse_button: 'officeUpload',
        // container: 'container',
        rename:true,
        // url : '../upload.php',
        url: "https://convertoffice.wilddog.com/upload",

        flash_swf_url: 'js/plupload/Moxie.swf', //引入flash,相对路径
        filters: [{
                title: "office",
                extensions: "pdf,doc,docx,ppt,pptx,pptm"
            }
        ],
    })
}


uploader.init();

uploader.bind('FilesAdded',function(uploader,files){
    console.log('FilesAdded!', files);
    uploader.start();
    //每个事件监听函数都会传入一些很有用的参数，
    //我们可以利用这些参数提供的信息来做比如更新UI，提示上传进度等操作
});

uploader.bind('UploadProgress',function(uploader,file){
    console.log('Progress:',file.percent,"%");
    //每个事件监听函数都会传入一些很有用的参数，
    //我们可以利用这些参数提供的信息来做比如更新UI，提示上传进度等操作
});

uploader.bind('Error',function(uploader,err){
    console.error('Error:',err);
    //每个事件监听函数都会传入一些很有用的参数，
    //我们可以利用这些参数提供的信息来做比如更新UI，提示上传进度等操作
});

uploader.bind('FileUploaded',function(uploader,file,result){
    console.log('FileUploaded!', result);
    var status = JSON.parse(result.response).status;
    var results = JSON.parse(result.response).results;
    if (status == 'success') {
        results.date = Date.now();
        wilddog.sync().child('officeFiles').push(results).then(function () {
            if (results.errors.length==0) {
                alert('上传成功！');
            } else {
                alert('上传成功！部分页码转码失败！');
            }
        }).catch(function (err) {
            alert('Sync 错误！'+err.message);
        });
    } else {
        alert('上传失败！');
    }
});

var initOfficeDisplay = function(ref, wdBoard) {
    var officeFiles = {};
    var wsUrl;
    var pptSyncWs;
    var currentPdfFile;
    var currentPdfPage = 1;
    var isPptMode = false;

    ref.child('officeFiles').on('child_added', function(snapshot) {
        if (snapshot.val().date + 86400000 < Date.now()) {
            ref.child('officeFiles/' + snapshot.key()).remove();
            ref.child('boards/' + snapshot.key()).remove();
            return;
        };
        officeFiles[snapshot.val().fileName] = snapshot.val();
        officeFiles[snapshot.val().fileName].key = snapshot.key();
        $("#office-selects").append("<option value='" + snapshot.val().fileName + "'>" + snapshot.val().fileName + "</option>");
    });
    $("#office-selects").change(function() {
        var opt = $("#office-selects").val();
        ref.child('currentPdfPage').remove();
        if (opt !== '无课件模式') {
            ref.child('currentFile').set(officeFiles[opt]);
        } else {
            ref.child('currentFile').remove();
        }
    });
    ref.child('currentFile').on('value', function(snapshot) {
        // wdBoard.clearPage();
        wdBoard.changePage(0);
        currentPdfPage = 1;
        if (snapshot.val()) {
            var fileInfo = getInfoFromFilePath(snapshot.val().fileName);
            wdBoard.changeRef(ref.child('boards/' + snapshot.val().key));
            if (fileInfo.type === 'ppt' || fileInfo.type === 'pptx' || fileInfo.type === 'pptm') {
                currentPdfFile = null;
                wdBoard.setBackgroundImg();
                wdBoard.setOption({
                    height: 576
                });
                $('.pdf-page-controls').hide();
                $('#ppt-frame').show();
                isPptMode = true;
                wsUrl = 'wss://pptsyncserver.wilddog.com/api/Ppt/?isListener=true&syn=' + excludeSpecial(fileInfo.name) + '&user=' + Date.now();
                if (pptSyncWs) {
                    pptSyncWs.close();
                } else {
                    establishConnection();
                }
                var url = 'https://pptserver.wilddogapp.com/?n=5&syn=' + excludeSpecial(fileInfo.name) + '&ssl=1&furl=' + snapshot.val().urls[0];
                $('#ppt-frame').attr('src', url);
            } else {
                currentPdfFile = snapshot.val();
                $('.pdf-page-controls').show();
                $('#ppt-frame').attr('src', null);
                $('#ppt-frame').hide();
                isPptMode = false;
                if (pptSyncWs) {
                    pptSyncWs.close();
                    pptSyncWs = null;
                };
                wdBoard.setOption({
                    height: 1400
                });
                var imgUrl = currentPdfFile.urls[0].url;
                window.img = wdBoard.createImage(imgUrl);
                img.on('inited', function() {
                    var style = img.toJSON().style;
                    var scale = boardConfig.width / style.width
                    img.updateOptions({
                        scaleX: scale,
                        scaleY: scale,
                        top: (style.top * scale),
                        left: (style.left * scale),
                    });
                    console.log(img.toJSON());
                })
                img.setAsBackground();
                $('#pdf-current-page').text('1/' + currentPdfFile.info.Pages);
                ref.child('currentPdfPage').on('value', function(snap) {
                    if (snap.val() !== null) {
                        currentPdfPage = snap.val();
                        wdBoard.changePage(currentPdfPage - 1);
                        var img = wdBoard.createImage(currentPdfFile.urls[currentPdfPage - 1].url);
                        img.on('inited', function() {
                            var style = img.toJSON().style;
                            var scale = boardConfig.width / style.width
                            img.updateOptions({
                                scaleX: scale,
                                scaleY: scale,
                                top: (style.top * scale),
                                left: (style.left * scale),
                            })
                        })
                        img.setAsBackground();
                        $('#pdf-current-page').text(currentPdfPage + '/' + currentPdfFile.info.Pages);
                    }
                })
            };
            $("#office-selects  option[value='" + fileInfo.name + "'] ").attr("selected", true)
        } else {
            wdBoard.changeRef(ref);
            wdBoard.setBackgroundImg();
            currentPdfFile = null;
            wdBoard.setOption({
                height: 576
            });
            $('.pdf-page-controls').hide();
            $('#ppt-frame').hide();
            isPptMode = false;
            if (pptSyncWs) {
                pptSyncWs.close();
                pptSyncWs = null;
            }
            $("#office-selects  option[value='无课件模式'] ").attr("selected", true)
        }
    });

    $('#pdf-last-page').click(function() {
        if (currentPdfPage <= 1) {
            return;
        } else {
            currentPdfPage--;
            ref.child('currentPdfPage').set(currentPdfPage);
        }
    })

    $('#pdf-next-page').click(function() {
        if (currentPdfPage >= currentPdfFile.info.Pages) {
            return;
        } else {
            currentPdfPage++;
            ref.child('currentPdfPage').set(currentPdfPage);
        }
    });



    var establishConnection = function() {
        var currentPage = 0;
        pptSyncWs = new WebSocket(wsUrl);
        var lastConnectionAttemptTime = Date.now();
        var reconnectDelay = 1000;
        var maxReconnectDelay = 30000;
        var resetDelayTimeout = null;

        var onDisconnect = function() {
            if (!isPptMode) {
                return;
            };
            if (resetDelayTimeout) {
                clearTimeout(resetDelayTimeout);
            };
            var timeSinceLastConnectAttempt = Date.now() - lastConnectionAttemptTime;
            var currentDelay = Math.max(0, reconnectDelay - timeSinceLastConnectAttempt);
            currentDelay = Math.random() * currentDelay;
            reconnectDelay = Math.min(maxReconnectDelay, reconnectDelay * 1.3);

            setTimeout(function() {
                lastConnectionAttemptTime = Date.now();
                pptSyncWs = new WebSocket(wsUrl);
                wsInit(pptSyncWs);
            }, currentDelay);
        }

        var wsInit = function(ws) {
            ws.onopen = function() {
                resetDelayTimeout = setTimeout(function() {
                    reconnectDelay = 1000;
                    resetDelayTimeout = null;
                }, 30000);
            };

            ws.onmessage = function(message) {
                if (message.data != '3') {
                    var pageIndex = message.data.split(',')[0] - 1;
                    if (currentPage != pageIndex) {
                        currentPage = pageIndex;
                        wdBoard.changePage(pageIndex);
                    }
                }
            };

            ws.onerror = function() {
                ws.close();
            };

            var interval = setInterval(function() {
                ws.send('2');
            }, 25000);

            ws.onclose = function() {
                clearInterval(interval);
                onDisconnect();
            };


        };

        wsInit(pptSyncWs);
    }
}


function excludeSpecial(s) {
    // 去掉转义字符
    s = s.replace(/[\'\"\\\/\b\f\n\r\t]/g, '');
    // 去掉特殊字符
    s = s.replace(/[\;\/\?\:\@\=\&\<\>\"\#\%\{\}\|\\\^\~\[\]\`\ \$\￥]/g,'');
    return s;
};

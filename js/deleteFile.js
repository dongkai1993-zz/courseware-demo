
function deleteFile(key) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            var message = req.responseText;
            if (req.status == 200) {
                //success
            } else {
                //failed
            }
        }
    }
    req.open('GET', 'delete?bucket=wilddaog&key=' + key, true);
    req.onerror = function(err) {
        console.error(err);
    };
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.send();
}

var  express = require("express"),
     http = require("http"),
     crypto = require("crypto"),
     fs = require("fs"),
     sys = require("sys"),
     config = require("./config");
     QRCode = require("qrcode"),
     form = require("connect-form");
     
var postmark = require("postmark-api")(config.postmark_key);

var app = express.createServer(
  form({ keepExtensions: true })
);
app.use(express.static(__dirname + '/public'));

function couchdb_request(obj) {
  if (!obj) { obj = {}; }
  obj.port = config.couchdb.port;
  obj.host = config.couchdb.host;
  var pathRegex = new RegExp("^\/"+config.couchdb.database+"\/")
  if (obj.path == null || obj.path == undefined) { obj.path = ""; }
  if (!pathRegex.test(obj.path))
    obj.path = ("/" + config.couchdb.database + "/" + obj.path).replace("//", "/"); //handle duplicate slashes gracefully
  if (!obj.headers) 
    obj.headers = {};
  if (!obj.headers['Content-Type']) 
    obj.headers['Content-Type'] = 'application/json'; 
  if (config.couchdb.user) 
    obj.headers["Authorization"] = 'Basic ' + new Buffer(config.couchdb.user + ':' + config.couchdb.password).toString('base64');
  if (!obj.method)
    obj.method = 'GET';
  return obj;
}

function markSent(doc) {
  doc.sent_at = +(new Date);
  var update = http.request(couchdb_request({path: doc._id, method: "PUT"}));
  update.write(JSON.stringify(doc));
  update.end();
}

function checkIn(doc) {
  doc.checked_in_at = +(new Date);
  var update = http.request(couchdb_request({path: doc._id, method: "PUT"}));
  update.write(JSON.stringify(doc));
  update.end();
}



app.get("/"+(config.prefix)+"/notify", function (req,res) {
  var cdbr = couchdb_request({path: "/_all_docs?include_docs=true"});
  http.request(cdbr, function (docs_res) {
    var body = "";
    docs_res.setEncoding('utf8');
    docs_res.on("data", function (chunk) {
      body+=chunk;
    });
    docs_res.on("end", function () {
      var docs = JSON.parse(body);
      for (var i = 0; i< docs.total_rows; i++) {
        var doc = docs.rows[i].doc;
        if (!doc.sent_at) {
          (function (ldoc, fn) {
            QRCode.save((__dirname+"/public/"+fn+".png"), config.base_url+"/"+doc._id, function (error,canvas) {
              var html = config.template.replace(/{{first_name}}/g, ldoc.first_name).replace(/{{last_name}}/g, ldoc.last_name).replace(/{{image_url}}/g, config.base_url+"/"+fn+".png");
              postmark.send({
                "From": config.postmark_from,
                "To": ldoc.email,
                "Subject": config.subject,
                "HtmlBody": html
              }, function (o,resp) { 
                if (resp && resp["ErrorCode"] == 0) { // did send
                  markSent(ldoc);
                }
              });
            });
          })(doc, crypto.createHash('md5').update("" + (doc._id)).digest("hex"))
        }
      }
      res.send("QR-ed em");
    });
  }).end();
})

app.get("/"+(config.prefix)+"/load", function (req,res) {
  res.send('<html><head><title>FEED ME!</title></head><body>'
      + '<form method="post" enctype="multipart/form-data">'
      + '<p>File: <input type="file" name="toload" /></p>'
      + '<p><input type="submit" value="Upload" /></p>'
      + '</form></body></html>');
});

app.get("/"+(config.prefix)+"/loaded", function (req,res) {
  res.send('<html><head><title>THANK YOU</title></head><body>'
      + '<p>All your attendes are belong to us.</p>'
      + '</body></html>');
});
app.post("/"+(config.prefix)+"/load", function (req,res) {
  req.form.complete(function(err, fields, files){
      if (err) {
        next(err);
      } else {
        fs.readFile(files.toload.path, function (err, fileBuffer) {
          var data = fileBuffer.toString();
          var lines = (data.indexOf("\n") >= 0) ? data.toString().split("\n") : data.toString().split("\r");
          lines.shift();
          var ll = lines.length;
          var bulk = {
            docs:[]
          };
          for (var i =0; i < ll; i++) {
            var myline = lines[i].replace(/\".*?\"/,'""');  //cut out crap.
            var parts = myline.split(",");
            var email = parts[3];
            var fn = parts[0];
            var sn = parts[1];
            
            if (email) {
              bulk.docs.push({"_id": (""+sn+":"+email.replace(/[\@\.]/g,"_")).toLowerCase(), "checked_in_at": 0, "email": email, "first_name":fn, "last_name": sn});
            } else { 
              console.log(myline) 
            }
            
          }
          
          // bulk load
          var creq = couchdb_request({path: "_bulk_docs", method: "POST"});
          var doc = http.request(creq, function (cres) {
            if (cres.statusCode != 200 && cres.statusCode != 201) {
              console.log("Did not load: "+bulk);
            } else { 
              res.redirect("/"+(config.prefix)+"/loaded");
            }
          });
          doc.write(JSON.stringify(bulk));
          doc.end();
          
        });
      }
    });
});

app.get('/:id', function(req, res){
  if (req.params.id) {
    var creq = couchdb_request({path: req.params.id});
    http.request(creq, function (cres) {
      if (cres.statusCode == 200) {
        // mark as counted
        var doc = "";
        cres.setEncoding('utf8');
        cres.on('data', function (chunk) {
          doc += chunk;
        });
        cres.on('end', function () {
          ddoc = JSON.parse(doc);
          if (ddoc.checked_in_at) {
            res.send("<html><head></head><body style='background:red; height: 100%;'><h1 style='color:white; font-weight:bold; text-align:center; font-size:80px;'>GTFO</h1></body></html>");
          } else {
            res.send("<html><head></head><body style='background:green; height: 100%;'><h1 style='color:white; font-weight:bold; text-align:center; font-size:80px;'>OK</h1></body></html>");
            checkIn(ddoc);
          }
        });
      } else {
        res.send("<html><head></head><body style='background:red; height: 100%;'><h1 style='color:white; font-weight:bold; text-align:center; font-size:80px;'>GTFO</h1></body></html>")
      }
    }).end();
  } else { 
    res.send("<html><head></head><body style='background:red; height: 100%;'><h1 style='color:white; font-weight:bold; text-align:center; font-size:80px;'>GTFO</h1></body></html>")
  }
});

app.get('/', function(req, res){
  res.send("<html><head></head><body style='background:red; height: 100%;'><h1 style='color:white; font-weight:bold; text-align:center; font-size:80px;'>NO</h1></body></html>")
});

app.listen(process.env["PORT"] || 3001);
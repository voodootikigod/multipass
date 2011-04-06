module.exports.couchdb =  {
  port: 5984,
  host: "localhost",
  user: null,
  password: null,
  database: "example"
};
module.exports.base_url = "http://checkin.example.com";
module.exports.postmark_key = "INSERT-POST-MARK-KEY-HERE";
module.exports.prefix = "multipass";
module.exports.postmark_from = "test@example.com";

module.exports.template = "<html><head></head><body><p>Dear {{first_name}} {{last_name}},</p><p>Attached is your QR Code for access to the parties.</p><p><img src='{{image_url}}'/></body></html>";
module.exports.subject = "AwesomeConf 2011 Party Admission Token";
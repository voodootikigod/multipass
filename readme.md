Multipass
=========

"Oh, so you don't know you won a trip to Fhloston Paradise for two for 10 days?" Ever needed to create an entrance/admission system for a bunch of geeks that allows you to quickly identify the people who are allowed versus those that are not? Like, let's say you are hosting a party and you are worried about all developers descending on your party despite the cover charge. How do you pick out the ones that have paid versus those that haven't? Meet Multipass. You upload one or many CSV files of your attendees with a header row and columns of FirstName, LastName, Organization, Email,... and then instruct multipass to notify them. This will create a unique QR code and mail it to them (wrapped in an email template you provide). This QR code can be read by any QR reader on any mobile device. It opens up a web page that tells you if the person is 1.) on the list and 2.) has not checked in yet with a simple green page with OK on it. If the QR code has been used to checkin already OR is not a valid QR code for the registered user, it will return back a simple red page with "GTFO" on it, indicating that the person in front of you is a party crasher.

Due to the nature of this (and the rapid development) everything is obscured by a simple prefix which you set in your config.js (can be created from the config-tmpl.js file provided). The system uses [Postmark](http://www.postmarkapp.com) for all email delivery which allows you to send your first 1000 emails for free, so woo hoo.

Requires:

  * CouchDB server
  * Postmark Account (and specifically API Key)
  * A party.

Dependencies:

  * [express](http://expressjs.com/)
  * [qrcode](https://github.com/soldair/node-qrcode)
  * [canvas](https://github.com/learnboost/node-canvas)

Quiver ladies, quiver.